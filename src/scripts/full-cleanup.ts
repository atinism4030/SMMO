/**
 * SMMO Full Company Reset
 *
 * Promotes Altin and Ethnik to CEO / Co-Founder, deactivates the generic
 * admin account, and wipes ALL operational data (clients, boards, tasks,
 * payments, finances, bookings, reports, content, documents, activity logs)
 * so the company can start entering real data from scratch.
 *
 * Wallets are KEPT (Company Bank / Altin / Ethnik / Savings are structural,
 * not demo data) — their transaction history is cleared so balances reset
 * to zero, not the wallet records themselves.
 *
 * Usage:
 *   npm run cleanup:full -- --confirm
 *
 * Without --confirm this prints exactly what it would do and exits safely.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const raw = trimmed.slice(idx + 1).trim();
    const val = raw.replace(/^(["'])(.*)\1$/, '$2');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// Emails identifying the two Co-Founders — update these if they differ.
const COFOUNDER_EMAILS = ['atinism.4030@gmail.com', 'etnikz2002@gmail.com'];

const OPERATIONAL_COLLECTIONS = [
  'clients', 'boards', 'tasks', 'clientpayments', 'billingperiods',
  'financetransactions', 'bookings', 'monthlyreports', 'contentitems', 'agreements',
  'generateddocuments', 'activitylogs',
];

async function main() {
  const hasConfirm = process.argv.includes('--confirm');
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI is missing.'); process.exit(1); }

  await mongoose.connect(uri, { bufferCommands: false });
  const db = mongoose.connection.db!;

  const users = await db.collection('users').find({}).toArray();
  const cofounders = users.filter((u) => COFOUNDER_EMAILS.includes(u.email));
  const others = users.filter((u) => !COFOUNDER_EMAILS.includes(u.email));

  console.log('\n  SMMO FULL COMPANY RESET');
  console.log('  ------------------------\n');
  console.log('  Will PROMOTE to CEO / Co-Founder:');
  cofounders.forEach((u) => console.log(`    - ${u.name} <${u.email}> (currently ${u.role})`));
  if (cofounders.length < 2) {
    console.log(`  WARNING: expected 2 co-founder accounts, found ${cofounders.length}. Check COFOUNDER_EMAILS.`);
  }
  console.log('\n  Will DEACTIVATE (not delete — kept for audit/rollback):');
  others.filter((u) => u.role === 'CEO').forEach((u) => console.log(`    - ${u.name} <${u.email}> (CEO)`));
  console.log('\n  Will DELETE (all documents, every collection):');
  for (const name of OPERATIONAL_COLLECTIONS) {
    const count = await db.collection(name).countDocuments().catch(() => 0);
    console.log(`    - ${name}: ${count} document(s)`);
  }
  console.log('\n  Will DELETE all non-co-founder user accounts (workers, client portal accounts):');
  others.filter((u) => u.role !== 'CEO').forEach((u) => console.log(`    - ${u.name} <${u.email}> (${u.role})`));
  console.log('\n  Will KEEP as-is:');
  console.log('    - wallets (4 records) — transaction history cleared, balances reset to €0');
  console.log('    - Altin + Ethnik login credentials (unchanged, only role changes)\n');

  if (!hasConfirm) {
    console.log('  Nothing was changed. Re-run with --confirm to execute.\n');
    process.exit(0);
  }

  // ── Promote co-founders ──────────────────────────────────────────────
  for (const u of cofounders) {
    await db.collection('users').updateOne({ _id: u._id }, { $set: { role: 'CEO' }, $unset: { clientId: '' } });
    console.log(`  Promoted ${u.name} to CEO`);
  }

  // ── Deactivate other CEO accounts (generic admin) ────────────────────
  const otherCeoIds = others.filter((u) => u.role === 'CEO').map((u) => u._id);
  if (otherCeoIds.length > 0) {
    await db.collection('users').updateMany({ _id: { $in: otherCeoIds } }, { $set: { status: 'INACTIVE' } });
    console.log(`  Deactivated ${otherCeoIds.length} generic CEO account(s)`);
  }

  // ── Delete every non-co-founder account (workers + client portal users) ──
  const deleteUserIds = others.filter((u) => u.role !== 'CEO').map((u) => u._id);
  if (deleteUserIds.length > 0) {
    const r = await db.collection('users').deleteMany({ _id: { $in: deleteUserIds } });
    console.log(`  Deleted ${r.deletedCount} worker/client account(s)`);
  }

  // ── Wipe operational data ─────────────────────────────────────────────
  let totalDeleted = 0;
  for (const name of OPERATIONAL_COLLECTIONS) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) continue;
    const r = await db.collection(name).deleteMany({});
    if (r.deletedCount > 0) console.log(`  ${name}: ${r.deletedCount} document(s) deleted`);
    totalDeleted += r.deletedCount;
  }

  console.log(`\n  Reset complete. ${totalDeleted} operational document(s) removed.`);
  console.log('  Wallets kept (balances now €0). Altin and Ethnik are now CEO / Co-Founder.\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
