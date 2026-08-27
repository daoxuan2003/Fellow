const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addMonthsClamped,
  deriveOwnerSummary,
  generateInstallments,
  normalizePockets,
  paydayCycleForMonth,
  paydayCycleKey,
  rebalanceInstallmentAmount
} = require('../utils/walletPlanner');

test('installment dates stay on the local calendar and clamp month ends', () => {
  assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonthsClamped('2027-01-31', 1), '2027-02-28');
  assert.equal(addMonthsClamped('2028-01-31', 1), '2028-02-29');
});

test('payday cycles run from the 25th through the following 24th across year boundaries', () => {
  assert.equal(paydayCycleKey('2026-08-24'), '2026-07');
  assert.equal(paydayCycleKey('2026-08-25'), '2026-08');
  assert.deepEqual(paydayCycleForMonth('2026-12'), {
    key: '2026-12',
    startDate: '2026-12-25',
    endDate: '2027-01-24'
  });
});

test('installment rounding preserves the exact total and puts remainder in the final row', () => {
  const rows = generateInstallments({
    amount: 100,
    feeAmount: 0.01,
    count: 3,
    firstDueDate: '2026-08-31'
  });
  assert.deepEqual(rows.map(row => row.dueDate), ['2026-08-31', '2026-09-30', '2026-10-31']);
  assert.deepEqual(rows.map(row => row.plannedAmount), [33.33, 33.33, 33.35]);
  assert.equal(Math.round(rows.reduce((sum, row) => sum + row.plannedAmount, 0) * 100), 10001);
});

test('safe-to-spend excludes expected income and reports incomplete inputs honestly', () => {
  const summary = deriveOwnerSummary({
    ownerId: 'mine',
    accounts: [{ userId: 'mine', type: 'asset', subType: 'bank', balance: 1200 }],
    debts: [{
      ownerId: 'mine',
      status: 'active',
      originalAmount: 600,
      feeAmount: 0,
      outstandingAmount: 600,
      schedule: [{ dueDate: '2026-08-30', plannedAmount: 300, paidAmount: 0, status: 'pending' }]
    }],
    monthlyPlan: null,
    today: '2026-08-25',
    cycleStart: '2026-08-25',
    cycleEnd: '2026-09-24'
  });
  assert.equal(summary.safeToSpend, 900);
  assert.equal(summary.confidence, 'incomplete');
  assert.deepEqual(summary.missing, ['monthly_plan']);
});

test('monthly pockets use all five stable buckets and reserves can expose a deficit', () => {
  const plan = {
    expectedIncome: { amount: 9999, date: '2026-08-28' },
    pockets: normalizePockets([
      { key: 'debt', amount: 500 },
      { key: 'living', amount: 600 },
      { key: 'travel', amount: 100 },
      { key: 'couple', amount: 200 }
    ])
  };
  const summary = deriveOwnerSummary({
    ownerId: 'mine',
    accounts: [{ userId: 'mine', type: 'asset', subType: 'bank', balance: 1000 }],
    debts: [],
    monthlyPlan: plan,
    today: '2026-08-25',
    cycleStart: '2026-08-25',
    cycleEnd: '2026-09-24'
  });
  assert.deepEqual(plan.pockets.map(row => row.key), ['debt', 'living', 'travel', 'couple', 'flexible']);
  assert.equal(summary.safeToSpend, -400);
  assert.equal(summary.deficit, 400);
  assert.equal(summary.forecastIncome, 9999);
  assert.equal(summary.projectedSafeToSpend, 9599);
  assert.equal(summary.confidence, 'complete');
});

test('pocket usage follows real expenses and keeps remaining reserves aligned with account balances', () => {
  const summary = deriveOwnerSummary({
    ownerId: 'mine',
    accounts: [
      { _id: 'asset', userId: 'mine', type: 'asset', subType: 'bank', balance: 800 },
      { _id: 'investment', userId: 'mine', type: 'asset', subType: 'investment', balance: 2000 }
    ],
    debts: [],
    transactions: [
      { creatorId: 'mine', type: 'expense', kind: 'expense', amount: 200, accountId: 'asset', walletPocketKey: 'living' },
      { creatorId: 'mine', type: 'expense', kind: 'debt_purchase', amount: 50, accountId: 'liability', walletPocketKey: 'living' },
      { creatorId: 'mine', type: 'expense', kind: 'expense', amount: 20, accountId: 'investment', walletPocketKey: 'living' },
      { creatorId: 'mine', type: 'expense', kind: 'expense', amount: 30, accountId: null, walletPocketKey: null }
    ],
    monthlyPlan: {
      expectedIncome: { amount: 0, date: '' },
      pockets: normalizePockets([
        { key: 'living', amount: 600 },
        { key: 'couple', amount: 200 }
      ])
    },
    today: '2026-08-25',
    cycleStart: '2026-08-25',
    cycleEnd: '2026-09-24'
  });
  const living = summary.pockets.find(pocket => pocket.key === 'living');
  assert.deepEqual(living, {
    key: 'living', amount: 600, spent: 270, remaining: 330,
    overspent: 0, usagePercent: 45, progress: 45
  });
  assert.equal(summary.unassignedSpent, 30);
  assert.equal(summary.unassignedCount, 1);
  assert.equal(summary.nonLiquidSpent, 100);
  assert.equal(summary.safeToSpend, 170);
  assert.equal(summary.confidence, 'incomplete');
  assert.deepEqual(summary.missing, ['unassigned_transactions']);
});

test('debt payments automatically consume the payer debt pocket', () => {
  const summary = deriveOwnerSummary({
    ownerId: 'payer',
    accounts: [{ _id: 'asset', userId: 'payer', type: 'asset', subType: 'bank', balance: 900 }],
    debts: [],
    transactions: [{
      creatorId: 'payer', type: 'transfer', kind: 'debt_payment', amount: 100,
      accountId: 'asset', walletPocketKey: null
    }],
    monthlyPlan: { pockets: normalizePockets([{ key: 'debt', amount: 500 }]) },
    today: '2026-08-25',
    cycleStart: '2026-08-25',
    cycleEnd: '2026-09-24'
  });
  const debt = summary.pockets.find(pocket => pocket.key === 'debt');
  assert.equal(debt.spent, 100);
  assert.equal(debt.remaining, 400);
  assert.equal(summary.debtReserve, 400);
  assert.equal(summary.safeToSpend, 500);
});

test('same-day income is forecast without changing current cash while overdue debts stay reserved', () => {
  const summary = deriveOwnerSummary({
    ownerId: 'mine',
    accounts: [{ userId: 'mine', type: 'asset', subType: 'bank', balance: 1000 }],
    debts: [{
      ownerId: 'mine',
      status: 'active',
      originalAmount: 800,
      feeAmount: 0,
      outstandingAmount: 800,
      schedule: [
        { dueDate: '2026-08-24', plannedAmount: 100, paidAmount: 0, status: 'pending' },
        { dueDate: '2026-08-25', plannedAmount: 600, paidAmount: 0, status: 'pending' },
        { dueDate: '2026-09-25', plannedAmount: 200, paidAmount: 0, status: 'pending' }
      ]
    }],
    monthlyPlan: {
      expectedIncome: { title: '工资', amount: 3000, date: '2026-08-25' },
      pockets: normalizePockets([])
    },
    today: '2026-08-25',
    cycleStart: '2026-08-25',
    cycleEnd: '2026-09-24'
  });
  assert.equal(summary.upcomingDebt, 700);
  assert.equal(summary.safeToSpend, 300);
  assert.equal(summary.projectedSafeToSpend, 3300);
  assert.equal(summary.sameDayDebtAmount, 600);
  assert.equal(summary.expectedIncomeState, 'today');
});

test('past expected income is not counted twice after its planned arrival date', () => {
  const summary = deriveOwnerSummary({
    ownerId: 'mine',
    accounts: [{ userId: 'mine', type: 'asset', subType: 'bank', balance: 1000 }],
    debts: [],
    monthlyPlan: {
      expectedIncome: { title: '工资', amount: 3000, date: '2026-08-25' },
      pockets: normalizePockets([])
    },
    today: '2026-08-26',
    cycleStart: '2026-08-25',
    cycleEnd: '2026-09-24'
  });
  assert.equal(summary.expectedIncomeState, 'past');
  assert.equal(summary.forecastIncome, 0);
  assert.equal(summary.projectedSafeToSpend, 1000);
});

test('editing one installment preserves the total remaining repayment plan', () => {
  const schedule = [
    { _id: 'one', sequence: 1, plannedAmount: 100, paidAmount: 20, status: 'partial' },
    { _id: 'two', sequence: 2, plannedAmount: 100, paidAmount: 0, status: 'pending' },
    { _id: 'three', sequence: 3, plannedAmount: 100, paidAmount: 0, status: 'pending' }
  ];
  rebalanceInstallmentAmount(schedule, 'one', 150);
  assert.deepEqual(schedule.map(item => item.plannedAmount), [150, 100, 50]);
  assert.equal(schedule.reduce((sum, item) => sum + item.plannedAmount - item.paidAmount, 0), 280);

  rebalanceInstallmentAmount(schedule, 'one', 90);
  assert.deepEqual(schedule.map(item => item.plannedAmount), [90, 100, 110]);
  assert.equal(schedule.reduce((sum, item) => sum + item.plannedAmount - item.paidAmount, 0), 280);
});

test('the last open installment cannot silently change the outstanding total', () => {
  assert.throws(
    () => rebalanceInstallmentAmount([
      { _id: 'only', sequence: 1, plannedAmount: 80, paidAmount: 20, status: 'partial' }
    ], 'only', 70),
    /LAST_INSTALLMENT_FIXED/
  );
});
