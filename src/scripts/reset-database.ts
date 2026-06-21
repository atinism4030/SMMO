/**
 * SMMO Database Reset Script
 *
 * Usage:
 *   npm run reset-db -- --confirm
 *
 * Without --confirm the script prints a warning and exits safely.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Load .env.local (Next.js doesn't load it for standalone scripts)
// ---------------------------------------------------------------------------
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
    // Strip surrounding quotes if present
    const val = raw.replace(/^(["'])(.*)\1$/, '$2');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Known SMMO collections (Mongoose default: model name lowercased + 's')
// ---------------------------------------------------------------------------
const SMMO_COLLECTIONS = [
  'users',
  'clients',
  'boards',
  'tasks',
  'payments',
  'agreements',
  'generateddocuments',
  'activitylogs',
  'contentitems',
  'photoshootsessions',
  'reports',
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const hasConfirm = process.argv.includes('--confirm');

  if (!hasConfirm) {
    console.log('');
    console.log('  Database reset was NOT executed.');
    console.log('  Run with --confirm to proceed:');
    console.log('');
    console.log('    npm run reset-db -- --confirm');
    console.log('');
    console.log('  WARNING: This permanently deletes ALL SMMO data.');
    console.log('');
    process.exit(0);
  }

  loadEnvLocal();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('');
    console.error('  MONGODB_URI is missing.');
    console.error('  Please add it to .env.local and try again.');
    console.error('');
    process.exit(1);
  }

  console.log('');
  console.log('  SMMO DATABASE RESET');
  console.log('  -------------------');
  console.log('  Connecting to MongoDB...');

  try {
    await mongoose.connect(uri, { bufferCommands: false });
  } catch (err) {
    console.error('');
    console.error('  MongoDB connection failed:');
    console.error(' ', err);
    console.error('');
    process.exit(1);
  }

  const db = mongoose.connection.db!;

  // Discover which of the known collections actually exist in the database
  const existing = await db.listCollections().toArray();
  const existingNames = new Set(existing.map((c) => c.name));

  let totalDeleted = 0;
  const errors: string[] = [];

  for (const name of SMMO_COLLECTIONS) {
    if (!existingNames.has(name)) {
      console.log(`  -  ${name}: collection does not exist — skipping`);
      continue;
    }
    try {
      const result = await db.collection(name).deleteMany({});
      const n = result.deletedCount;
      if (n > 0) {
        console.log(`  v  ${name}: ${n} document${n === 1 ? '' : 's'} deleted`);
      } else {
        console.log(`  -  ${name}: already empty`);
      }
      totalDeleted += n;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  x  ${name}: FAILED — ${msg}`);
      errors.push(name);
    }
  }

  await mongoose.disconnect();

  console.log('');
  if (errors.length === 0) {
    console.log(`  Reset complete. ${totalDeleted} total document${totalDeleted === 1 ? '' : 's'} deleted.`);
    console.log('');
    console.log('  Next steps:');
    console.log('    1. npm run dev');
    console.log('    2. Open http://localhost:3000');
    console.log('    3. You will be redirected to /setup');
    console.log('    4. Create your CEO/Admin account');
    console.log('    5. Log in and start fresh');
  } else {
    console.log(`  Reset finished with errors on: ${errors.join(', ')}`);
    console.log(`  ${totalDeleted} document${totalDeleted === 1 ? '' : 's'} deleted.`);
    process.exit(1);
  }
  console.log('');
}

main().catch((err) => {
  console.error('  Unexpected error:', err);
  process.exit(1);
});
