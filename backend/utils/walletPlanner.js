const DAYS_IN_MONTH = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

const DEFAULT_POCKET_KEYS = ['debt', 'living', 'travel', 'couple', 'flexible'];

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function isLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [year, month, day] = value.split('-').map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH(year, month - 1);
}

function addMonthsClamped(localDate, monthsToAdd) {
  if (!isLocalDate(localDate)) throw new Error('INVALID_LOCAL_DATE');
  const [year, month, day] = localDate.split('-').map(Number);
  const absoluteMonth = year * 12 + (month - 1) + monthsToAdd;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonthIndex = absoluteMonth % 12;
  const targetDay = Math.min(day, DAYS_IN_MONTH(targetYear, targetMonthIndex));
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

function localDateToDate(localDate) {
  if (!isLocalDate(localDate)) throw new Error('INVALID_LOCAL_DATE');
  return new Date(`${localDate}T12:00:00+08:00`);
}

function generateInstallments({ amount, feeAmount = 0, count, firstDueDate }) {
  const principal = roundMoney(amount);
  const fees = roundMoney(feeAmount);
  const installmentCount = Number(count);
  if (!(principal > 0) || fees < 0 || !Number.isInteger(installmentCount)
    || installmentCount < 1 || installmentCount > 120 || !isLocalDate(firstDueDate)) {
    throw new Error('INVALID_INSTALLMENT_INPUT');
  }

  const totalCents = Math.round((principal + fees) * 100);
  const baseCents = Math.floor(totalCents / installmentCount);
  const remainder = totalCents - baseCents * installmentCount;

  return Array.from({ length: installmentCount }, (_, index) => ({
    sequence: index + 1,
    dueDate: addMonthsClamped(firstDueDate, index),
    plannedAmount: (baseCents + (index === installmentCount - 1 ? remainder : 0)) / 100,
    paidAmount: 0,
    status: 'pending'
  }));
}

function normalizePockets(pockets = []) {
  const provided = new Map(
    (Array.isArray(pockets) ? pockets : [])
      .filter(item => DEFAULT_POCKET_KEYS.includes(item?.key))
      .map(item => [item.key, Math.max(0, roundMoney(item.amount || 0))])
  );
  return DEFAULT_POCKET_KEYS.map(key => ({ key, amount: provided.get(key) || 0 }));
}

function getPocketAmount(plan, key) {
  return Number(plan?.pockets?.find(item => item.key === key)?.amount || 0);
}

function deriveOwnerSummary({ ownerId, accounts = [], debts = [], monthlyPlan = null, today, cutoffDate }) {
  const ownerAccounts = accounts.filter(account => String(account.userId) === String(ownerId));
  const liquidAssets = roundMoney(ownerAccounts
    .filter(account => account.type === 'asset' && account.subType !== 'investment' && !account.isArchived)
    .reduce((sum, account) => sum + Number(account.balance || 0), 0));
  const liabilities = roundMoney(ownerAccounts
    .filter(account => account.type === 'liability' && !account.isArchived)
    .reduce((sum, account) => sum + Number(account.balance || 0), 0));
  const ownerDebts = debts.filter(debt => String(debt.ownerId) === String(ownerId) && debt.status !== 'archived');
  const activeOwnerDebts = ownerDebts.filter(debt => debt.status === 'active');
  const upcomingDebt = roundMoney(activeOwnerDebts.reduce((sum, debt) => sum + debt.schedule
    .filter(item => item.status !== 'paid' && item.dueDate <= cutoffDate)
    .reduce((itemSum, item) => itemSum + Math.max(0, Number(item.plannedAmount) - Number(item.paidAmount || 0)), 0), 0));
  const debtReserve = Math.max(upcomingDebt, getPocketAmount(monthlyPlan, 'debt'));
  const essentialReserve = roundMoney(
    getPocketAmount(monthlyPlan, 'living') + getPocketAmount(monthlyPlan, 'travel')
  );
  const committedReserve = roundMoney(getPocketAmount(monthlyPlan, 'couple'));
  const safeToSpend = roundMoney(liquidAssets - debtReserve - essentialReserve - committedReserve);
  const plannedTotal = roundMoney((monthlyPlan?.pockets || []).reduce((sum, pocket) => sum + Number(pocket.amount || 0), 0));
  const paidDebt = roundMoney(ownerDebts.reduce((sum, debt) => sum + Math.max(0,
    Number(debt.originalAmount || 0) + Number(debt.feeAmount || 0) - Number(debt.outstandingAmount || 0)
  ), 0));
  const originalDebt = roundMoney(ownerDebts.reduce((sum, debt) => sum
    + Number(debt.originalAmount || 0) + Number(debt.feeAmount || 0), 0));

  return {
    ownerId: String(ownerId),
    today,
    cutoffDate,
    liquidAssets,
    liabilities,
    upcomingDebt,
    debtReserve: roundMoney(debtReserve),
    essentialReserve,
    committedReserve,
    safeToSpend,
    deficit: safeToSpend < 0 ? Math.abs(safeToSpend) : 0,
    confidence: monthlyPlan && ownerAccounts.some(account => account.type === 'asset') ? 'complete' : 'incomplete',
    missing: [
      ...(!monthlyPlan ? ['monthly_plan'] : []),
      ...(!ownerAccounts.some(account => account.type === 'asset') ? ['asset_account'] : [])
    ],
    expectedIncome: monthlyPlan?.expectedIncome || null,
    pockets: normalizePockets(monthlyPlan?.pockets),
    plannedTotal,
    debtProgress: originalDebt > 0 ? Math.min(100, Math.round((paidDebt / originalDebt) * 100)) : 0,
    originalDebt,
    paidDebt
  };
}

function allocatePayment(schedule, amount, startInstallmentId = null, paymentMeta = {}) {
  let remaining = roundMoney(amount);
  const allocations = [];
  const rows = [...schedule].sort((a, b) => a.sequence - b.sequence);
  let canAllocate = !startInstallmentId;

  for (const installment of rows) {
    if (String(installment._id) === String(startInstallmentId)) canAllocate = true;
    if (!canAllocate || installment.status === 'paid' || remaining <= 0) continue;
    const due = roundMoney(Number(installment.plannedAmount) - Number(installment.paidAmount || 0));
    if (due <= 0) continue;
    const applied = Math.min(due, remaining);
    installment.paidAmount = roundMoney(Number(installment.paidAmount || 0) + applied);
    remaining = roundMoney(remaining - applied);
    installment.status = installment.paidAmount >= installment.plannedAmount ? 'paid' : 'partial';
    if (installment.status === 'paid') {
      installment.paidAt = paymentMeta.paidAt || new Date();
      installment.paidBy = paymentMeta.paidBy || null;
      installment.paymentReference = paymentMeta.paymentReference || null;
    }
    allocations.push({ installmentId: installment._id, amount: applied });
  }

  if (remaining > 0 || allocations.length === 0) throw new Error('PAYMENT_EXCEEDS_SCHEDULE');
  return allocations;
}

function rebalanceInstallmentAmount(schedule, installmentId, plannedAmount) {
  const rows = [...schedule];
  const target = rows.find(item => String(item._id) === String(installmentId));
  if (!target || target.status === 'paid') throw new Error('INSTALLMENT_LOCKED');

  const paidCents = Math.round(Number(target.paidAmount || 0) * 100);
  const currentCents = Math.round(Number(target.plannedAmount || 0) * 100);
  const nextCents = Math.round(Number(plannedAmount) * 100);
  if (!Number.isFinite(nextCents) || nextCents <= paidCents) throw new Error('INVALID_INSTALLMENT_AMOUNT');

  let deltaCents = nextCents - currentCents;
  if (deltaCents === 0) return rows;
  const otherOpenRows = rows
    .filter(item => item !== target && item.status !== 'paid')
    .sort((left, right) => Number(right.sequence) - Number(left.sequence));
  if (!otherOpenRows.length) throw new Error('LAST_INSTALLMENT_FIXED');

  if (deltaCents > 0) {
    for (const item of otherOpenRows) {
      const itemPaidCents = Math.round(Number(item.paidAmount || 0) * 100);
      const itemPlannedCents = Math.round(Number(item.plannedAmount || 0) * 100);
      const reducibleCents = Math.max(0, itemPlannedCents - itemPaidCents - 1);
      const reductionCents = Math.min(reducibleCents, deltaCents);
      item.plannedAmount = (itemPlannedCents - reductionCents) / 100;
      deltaCents -= reductionCents;
      if (deltaCents === 0) break;
    }
    if (deltaCents > 0) throw new Error('INSTALLMENT_AMOUNT_TOO_LARGE');
  } else {
    const balancingRow = otherOpenRows[0];
    balancingRow.plannedAmount = roundMoney(Number(balancingRow.plannedAmount || 0) + (Math.abs(deltaCents) / 100));
  }

  target.plannedAmount = nextCents / 100;
  return rows;
}

module.exports = {
  DEFAULT_POCKET_KEYS,
  addMonthsClamped,
  allocatePayment,
  deriveOwnerSummary,
  generateInstallments,
  isLocalDate,
  localDateToDate,
  normalizePockets,
  rebalanceInstallmentAmount,
  roundMoney
};
