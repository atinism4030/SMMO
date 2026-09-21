/**
 * Migrates historical Social Media Management retainer payments out of
 * Finance and into the dedicated SMM payments tracker (BillingPeriod /
 * ClientPayment — see '@/lib/billingService').
 *
 * Source data: FinanceTransaction docs with category 'Social Media
 * Management' and a clientId. Their description/reference/notes were read
 * by hand to determine which calendar month(s) each payment covers (see the
 * MIGRATIONS table below) — transactionDate is only when the money arrived,
 * never which month it was for.
 *
 * For each client this:
 *   1. Enables billing (monthly fee, start month = their earliest covered
 *      month) — this generates one UNPAID BillingPeriod per month from the
 *      start month through the current month.
 *   2. Marks each identified paid month via recordManualPayment (pre-verified,
 *      never synced to Finance — exactly like a manual tick in the SMM tab),
 *      dated with the *original* Finance transaction's date.
 *   3. Voids the original Finance transactions (status VOIDED, not deleted)
 *      so this income stops being double-counted in Finance's wallet
 *      balances/summary now that it lives in the SMM tracker.
 *
 * Any month not explicitly listed as paid is left UNPAID — that's the whole
 * point: it now shows up as an outstanding month for that client.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-smm-payments.ts            (dry run — prints the plan)
 *   npx tsx src/scripts/migrate-smm-payments.ts --confirm  (executes it)
 */
import fs from 'fs';
import path from 'path';

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

const ACTOR_USER_ID = '6a385dcb64a8d1858101602a'; // Altin Ismaili (CEO) — attributed as the migration operator

interface PaymentToMigrate {
  year: number;
  month: number;
  amountMinor: number;
  paymentDate: string; // original Finance transaction date
  sourceFinanceTxnId: string;
  sourceDescription: string; // for the audit-trail note on the new ClientPayment
}

interface ClientMigration {
  clientName: string;
  clientId: string;
  monthlyFeeMinor: number;
  billingStartYear: number;
  billingStartMonth: number;
  payments: PaymentToMigrate[];
}

const MIGRATIONS: ClientMigration[] = [
  {
    clientName: 'Armandos',
    clientId: '6aafb877523c1c1bb095ec7f',
    monthlyFeeMinor: 25000,
    billingStartYear: 2026,
    billingStartMonth: 1, // January — inferred: this payment's own notes say "muajit e parë" (the first month), and the very next payment explicitly names February
    payments: [
      { year: 2026, month: 1, amountMinor: 25000, paymentDate: '2026-02-19', sourceFinanceTxnId: '6aafc6df70f0df3087002e45', sourceDescription: '"Armandos SMM" — notes: "pagesen e mujes par" (first month)' },
      { year: 2026, month: 2, amountMinor: 25000, paymentDate: '2026-03-23', sourceFinanceTxnId: '6aafc8f970f0df3087002e57', sourceDescription: '"Armandos SMM" — ref: "pagujti per muajin shkurt" (February)' },
      { year: 2026, month: 4, amountMinor: 25000, paymentDate: '2026-06-25', sourceFinanceTxnId: '6ab0166950c47beab4a03e7a', sourceDescription: '"Armandos Prill" (April)' },
      { year: 2026, month: 5, amountMinor: 25000, paymentDate: '2026-07-13', sourceFinanceTxnId: '6ab018c250c47beab4a03e94', sourceDescription: '"Armandos Maj" (May)' },
    ],
    // March 2026 has no matching payment anywhere in Finance — left UNPAID deliberately.
  },
  {
    clientName: 'Daxorol',
    clientId: '6aafb8b0523c1c1bb095ec81',
    monthlyFeeMinor: 25000,
    billingStartYear: 2026,
    billingStartMonth: 4, // April — reference explicitly says "muaji 1" (month 1) alongside "Prill" (April)
    payments: [
      { year: 2026, month: 4, amountMinor: 25000, paymentDate: '2026-05-20', sourceFinanceTxnId: '6ab0145a50c47beab4a03e6a', sourceDescription: '"Daxorol Prill" — ref: "Daxorol muaji 1" (April, month 1)' },
      { year: 2026, month: 5, amountMinor: 25000, paymentDate: '2026-07-08', sourceFinanceTxnId: '6ab018a550c47beab4a03e92', sourceDescription: '"Daxorol Maj Qershor" — €500 covering May+June, split into two €250 months (this is May)' },
      { year: 2026, month: 6, amountMinor: 25000, paymentDate: '2026-07-08', sourceFinanceTxnId: '6ab018a550c47beab4a03e92', sourceDescription: '"Daxorol Maj Qershor" — €500 covering May+June, split into two €250 months (this is June)' },
      { year: 2026, month: 7, amountMinor: 25000, paymentDate: '2026-09-01', sourceFinanceTxnId: '6ab0212b50c47beab4a03eb4', sourceDescription: '"Daxorol Korrik" (July)' },
    ],
    // August/September 2026 have no matching payment — left UNPAID.
  },
  {
    clientName: 'Meda 3',
    clientId: '6aafb8e9523c1c1bb095ec83',
    monthlyFeeMinor: 25000,
    billingStartYear: 2026,
    billingStartMonth: 6, // June — earliest evidence of an SMM-category payment for this client
    payments: [
      { year: 2026, month: 6, amountMinor: 25000, paymentDate: '2026-07-13', sourceFinanceTxnId: '6ab018e650c47beab4a03e96', sourceDescription: '"Meda 3 Qershor Korrik" — €500 covering June+July, split into two €250 months (this is June)' },
      { year: 2026, month: 7, amountMinor: 25000, paymentDate: '2026-07-13', sourceFinanceTxnId: '6ab018e650c47beab4a03e96', sourceDescription: '"Meda 3 Qershor Korrik" — €500 covering June+July, split into two €250 months (this is July)' },
      { year: 2026, month: 8, amountMinor: 25000, paymentDate: '2026-08-29', sourceFinanceTxnId: '6ab0210150c47beab4a03eb2', sourceDescription: '"Meda 3 Gusht" (August)' },
      { year: 2026, month: 9, amountMinor: 25000, paymentDate: '2026-09-20', sourceFinanceTxnId: '6ab022ed50c47beab4a03ec3', sourceDescription: '"Meda 3 Shtator" (September)' },
    ],
  },
];

// NOTE: Timimetal is deliberately excluded. Its one Finance transaction
// (2026-05-25, €450, category "Social Media Management", clientId set) has
// no month mentioned anywhere in its description/reference/notes. €450 is
// exactly 3× their €150 monthly fee, so it likely covers 3 months, but
// *which* 3 months is a guess this script refuses to make — get that
// confirmed, then extend MIGRATIONS the same way as the clients above.
const SKIPPED_TIMIMETAL_TXN_ID = '6ab015ea50c47beab4a03e76';

async function main() {
  const confirm = process.argv.includes('--confirm');
  loadEnvLocal();

  const { connectDB } = await import('@/lib/mongodb');
  const { updateClientBillingSettings, recordManualPayment } = await import('@/lib/billingService');
  const { voidTransaction } = await import('@/lib/financeService');
  const BillingPeriodModule = await import('@/models/BillingPeriod');
  const BillingPeriod = BillingPeriodModule.default;
  const FinanceTransactionModule = await import('@/models/FinanceTransaction');
  const FinanceTransaction = FinanceTransactionModule.default;

  await connectDB();

  console.log('\n  SMM PAYMENTS MIGRATION (Finance → Payments tracker)');
  console.log('  ----------------------------------------------------\n');

  let totalMigratedMinor = 0;
  let totalPaymentsCreated = 0;
  const financeTxnIdsToVoid = new Set<string>();

  for (const client of MIGRATIONS) {
    console.log(`${client.clientName}:`);
    console.log(`  Billing: €${(client.monthlyFeeMinor / 100).toFixed(2)}/mo, starting ${client.billingStartYear}-${String(client.billingStartMonth).padStart(2, '0')}`);
    for (const p of client.payments) {
      console.log(`  - ${p.year}-${String(p.month).padStart(2, '0')}: €${(p.amountMinor / 100).toFixed(2)} paid ${p.paymentDate}  ⟵  ${p.sourceDescription}`);
      totalMigratedMinor += p.amountMinor;
      totalPaymentsCreated += 1;
      financeTxnIdsToVoid.add(p.sourceFinanceTxnId);
    }
    console.log('');
  }

  console.log(`Total to migrate: €${(totalMigratedMinor / 100).toFixed(2)} across ${totalPaymentsCreated} months, ${MIGRATIONS.length} clients.`);
  console.log(`Finance transactions to void: ${financeTxnIdsToVoid.size}`);
  console.log(`Skipped (ambiguous, needs confirmation): Timimetal, transaction ${SKIPPED_TIMIMETAL_TXN_ID} (€450, no month stated)\n`);

  if (!confirm) {
    console.log('Dry run only — nothing was written. Re-run with --confirm to apply.\n');
    process.exit(0);
  }

  for (const client of MIGRATIONS) {
    await updateClientBillingSettings(
      client.clientId,
      {
        monthlyFeeMinor: client.monthlyFeeMinor,
        currency: 'EUR',
        billingStartDate: new Date(client.billingStartYear, client.billingStartMonth - 1, 1),
        billingEnabled: true,
      },
      ACTOR_USER_ID
    );

    for (const p of client.payments) {
      const period = await BillingPeriod.findOne({ clientId: client.clientId, year: p.year, month: p.month });
      if (!period) {
        console.error(`  ! Could not find billing period ${p.year}-${p.month} for ${client.clientName} — skipping this payment`);
        continue;
      }
      await recordManualPayment({
        clientId: client.clientId,
        billingPeriodId: period._id.toString(),
        amountMinor: p.amountMinor,
        createdBy: ACTOR_USER_ID,
        paymentDate: new Date(p.paymentDate),
        noteSuffix: `migrated from Finance transaction ${p.sourceFinanceTxnId} (${p.sourceDescription})`,
      });
    }
    console.log(`✓ Migrated ${client.clientName}`);
  }

  for (const txnId of financeTxnIdsToVoid) {
    const txn = await FinanceTransaction.findById(txnId);
    if (!txn) { console.error(`  ! Finance transaction ${txnId} not found — skipping void`); continue; }
    if (txn.status === 'VOIDED') { console.log(`  (already voided: ${txnId})`); continue; }
    await voidTransaction(txnId, ACTOR_USER_ID, 'Migrated to the Social Media Management payments tracker');
  }
  console.log(`✓ Voided ${financeTxnIdsToVoid.size} Finance transactions\n`);

  console.log('Done.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
