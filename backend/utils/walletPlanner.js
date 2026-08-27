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

function paydayCycleKey(localDate) {
  if (!isLocalDate(localDate)) throw new Error('INVALID_LOCAL_DATE');
  const month = localDate.slice(0, 7);
  if (Number(localDate.slice(8, 10)) >= 25) return month;
  return addMonthsClamped(`${month}-01`, -1).slice(0, 7);
}

function paydayCycleForMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw new Error('INVALID_MONTH');
  const startDate = `${month}-25`;
  if (!isLocalDate(startDate)) throw new Error('INVALID_MONTH');
  return {
    key: month,
    startDate,
    endDate: addMonthsClamped(`${month}-24`, 1)
  };
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

function derivePocketUsage({ ownerId, accounts = [], transactions = [], monthlyPlan = null }) {
  const assetAccountIds = new Set(accounts
    .filter(account => String(account.userId) === String(ownerId)
      && account.type === 'asset' && account.subType !== 'investment' && !account.isArchived)
    .map(account => String(account._id)));
  const spending = transactions.filter(transaction => (
    String(transaction.creatorId) === String(ownerId)
      && (transaction.type === 'expense' || transaction.kind === 'debt_payment')
      && Number(transaction.amount) > 0
  ));
  const spentByPocket = new Map(DEFAULT_POCKET_KEYS.map(key => [key, 0]));
  let unassignedSpent = 0;
  let unassignedCount = 0;
  let nonLiquidSpent = 0;

  for (const transaction of spending) {
    const amount = roundMoney(transaction.amount);
    const pocketKey = transaction.kind === 'debt_payment'
      ? 'debt'
      : DEFAULT_POCKET_KEYS.includes(transaction.walletPocketKey)
        ? transaction.walletPocketKey
        : null;
    if (pocketKey) {
      spentByPocket.set(pocketKey, roundMoney(spentByPocket.get(pocketKey) + amount));
    } else {
      unassignedSpent = roundMoney(unassignedSpent + amount);
      unassignedCount += 1;
    }
    if (!transaction.accountId || !assetAccountIds.has(String(transaction.accountId))) {
      nonLiquidSpent = roundMoney(nonLiquidSpent + amount);
    }
  }

  const pockets = normalizePockets(monthlyPlan?.pockets).map(pocket => {
    const amount = roundMoney(pocket.amount);
    const spent = roundMoney(spentByPocket.get(pocket.key) || 0);
    const remaining = roundMoney(Math.max(0, amount - spent));
    const overspent = roundMoney(Math.max(0, spent - amount));
    const usagePercent = amount > 0 ? Math.round((spent / amount) * 100) : spent > 0 ? 100 : 0;
    return {
      key: pocket.key,
      amount,
      spent,
      remaining,
      overspent,
      usagePercent,
      progress: Math.min(100, usagePercent)
    };
  });

  return {
    pockets,
    plannedTotal: roundMoney(pockets.reduce((sum, pocket) => sum + pocket.amount, 0)),
    spentTotal: roundMoney(pockets.reduce((sum, pocket) => sum + pocket.spent, 0)),
    remainingTotal: roundMoney(pockets.reduce((sum, pocket) => sum + pocket.remaining, 0)),
    overspentTotal: roundMoney(pockets.reduce((sum, pocket) => sum + pocket.overspent, 0)),
    unassignedSpent,
    unassignedCount,
    nonLiquidSpent
  };
}

function deriveOwnerSummary({ ownerId, accounts = [], debts = [], transactions = [], monthlyPlan = null, today, cycleStart, cycleEnd }) {
  const ownerAccounts = accounts.filter(account => String(account.userId) === String(ownerId));
  const liquidAssets = roundMoney(ownerAccounts
    .filter(account => account.type === 'asset' && account.subType !== 'investment' && !account.isArchived)
    .reduce((sum, account) => sum + Number(account.balance || 0), 0));
  const liabilities = roundMoney(ownerAccounts
    .filter(account => account.type === 'liability' && !account.isArchived)
    .reduce((sum, account) => sum + Number(account.balance || 0), 0));
  const ownerDebts = debts.filter(debt => String(debt.ownerId) === String(ownerId) && debt.status !== 'archived');
  const activeOwnerDebts = ownerDebts.filter(debt => debt.status === 'active');
  const pocketUsage = derivePocketUsage({ ownerId, accounts, transactions, monthlyPlan });
  const pocket = key => pocketUsage.pockets.find(item => item.key === key);
  const upcomingDebt = roundMoney(activeOwnerDebts.reduce((sum, debt) => sum + debt.schedule
    .filter(item => item.status !== 'paid' && item.dueDate <= cycleEnd)
    .reduce((itemSum, item) => itemSum + Math.max(0, Number(item.plannedAmount) - Number(item.paidAmount || 0)), 0), 0));
  const debtReserve = Math.max(upcomingDebt, pocket('debt').remaining);
  const essentialReserve = roundMoney(
    pocket('living').remaining + pocket('travel').remaining
  );
  const committedReserve = roundMoney(pocket('couple').remaining);
  const safeToSpend = roundMoney(
    liquidAssets - debtReserve - essentialReserve - committedReserve - pocketUsage.nonLiquidSpent
  );
  const expectedIncome = monthlyPlan?.expectedIncome || null;
  const expectedIncomeDate = String(expectedIncome?.date || '');
  const expectedIncomeAmount = Math.max(0, roundMoney(expectedIncome?.amount || 0));
  const incomeInCycle = isLocalDate(expectedIncomeDate)
    && expectedIncomeDate >= cycleStart && expectedIncomeDate <= cycleEnd && expectedIncomeAmount > 0;
  const expectedIncomeState = !incomeInCycle ? 'none'
    : expectedIncomeDate < today ? 'past'
      : expectedIncomeDate === today ? 'today' : 'future';
  const forecastIncome = ['today', 'future'].includes(expectedIncomeState) ? expectedIncomeAmount : 0;
  const projectedSafeToSpend = roundMoney(safeToSpend + forecastIncome);
  const sameDayDebtAmount = incomeInCycle ? roundMoney(activeOwnerDebts.reduce((sum, debt) => sum + debt.schedule
    .filter(item => item.status !== 'paid' && item.dueDate === expectedIncomeDate)
    .reduce((itemSum, item) => itemSum + Math.max(0, Number(item.plannedAmount) - Number(item.paidAmount || 0)), 0), 0)) : 0;
  const paidDebt = roundMoney(ownerDebts.reduce((sum, debt) => sum + Math.max(0,
    Number(debt.originalAmount || 0) + Number(debt.feeAmount || 0) - Number(debt.outstandingAmount || 0)
  ), 0));
  const originalDebt = roundMoney(ownerDebts.reduce((sum, debt) => sum
    + Number(debt.originalAmount || 0) + Number(debt.feeAmount || 0), 0));

  return {
    ownerId: String(ownerId),
    today,
    cycleStart,
    cycleEnd,
    cutoffDate: cycleEnd,
    liquidAssets,
    liabilities,
    upcomingDebt,
    debtReserve: roundMoney(debtReserve),
    essentialReserve,
    committedReserve,
    safeToSpend,
    deficit: safeToSpend < 0 ? Math.abs(safeToSpend) : 0,
    projectedSafeToSpend,
    projectedDeficit: projectedSafeToSpend < 0 ? Math.abs(projectedSafeToSpend) : 0,
    forecastIncome,
    forecastDate: forecastIncome > 0 ? expectedIncomeDate : '',
    expectedIncomeState,
    sameDayDebtAmount,
    confidence: monthlyPlan && ownerAccounts.some(account => account.type === 'asset')
      && pocketUsage.unassignedCount === 0 ? 'complete' : 'incomplete',
    missing: [
      ...(!monthlyPlan ? ['monthly_plan'] : []),
      ...(!ownerAccounts.some(account => account.type === 'asset') ? ['asset_account'] : []),
      ...(pocketUsage.unassignedCount > 0 ? ['unassigned_transactions'] : [])
    ],
    expectedIncome,
    ...pocketUsage,
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
  derivePocketUsage,
  generateInstallments,
  isLocalDate,
  localDateToDate,
  normalizePockets,
  paydayCycleForMonth,
  paydayCycleKey,
  rebalanceInstallmentAmount,
  roundMoney
};
