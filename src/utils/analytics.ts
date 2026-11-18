import { ASSET_CATEGORY_META } from '../data/seedData';
import {
  AssetAccountItem,
  AssetCategory,
  AssetCategoryBreakdownItem,
  AssetMonthTrendPoint,
  AssetSnapshotSummary,
  CategorySummaryItem,
  CategoryTag,
  LedgerEntry,
  MonthlyTrendPoint,
  PeriodMode,
  SummaryReport,
} from '../types/ledger';
import { formatPeriodLabel, getMonthDistance, getNextMonthKey, getPreviousMonthKey } from './formatters';

export function filterEntriesByPeriod(
  entries: LedgerEntry[],
  periodMode: PeriodMode,
  monthKey: string,
  yearKey: string
): LedgerEntry[] {
  const prefix = periodMode === 'month' ? monthKey : `${yearKey}-`;
  return entries.filter((e) => e.date.startsWith(prefix));
}

export function computeSummaryReport(
  allEntries: LedgerEntry[],
  tags: CategoryTag[],
  periodMode: PeriodMode,
  monthKey: string,
  yearKey: string,
  categoryFilterIds?: string[]
): SummaryReport {
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  let scoped = filterEntriesByPeriod(allEntries, periodMode, monthKey, yearKey);

  if (categoryFilterIds && categoryFilterIds.length > 0) {
    const allowed = new Set(categoryFilterIds);
    scoped = scoped.filter((e) => allowed.has(e.categoryId));
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let paidExpense = 0;
  let pendingExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  const incGroup = new Map<string, { total: number; count: number }>();
  const expGroup = new Map<string, { total: number; count: number }>();

  for (const entry of scoped) {
    if (entry.type === 'income') {
      totalIncome += entry.amount;
      incomeCount += 1;
      const cur = incGroup.get(entry.categoryId) || { total: 0, count: 0 };
      cur.total += entry.amount;
      cur.count += 1;
      incGroup.set(entry.categoryId, cur);
    } else {
      totalExpense += entry.amount;
      expenseCount += 1;
      if (entry.status === 'paid') paidExpense += entry.amount;
      else pendingExpense += entry.amount;

      const cur = expGroup.get(entry.categoryId) || { total: 0, count: 0 };
      cur.total += entry.amount;
      cur.count += 1;
      expGroup.set(entry.categoryId, cur);
    }
  }

  const incomeByCategory: CategorySummaryItem[] = Array.from(incGroup.entries())
    .map(([categoryId, stats]) => {
      const tag = tagMap.get(categoryId);
      return {
        categoryId,
        categoryName: tag?.name || '未分类收入',
        color: tag?.color || '#0F766E',
        type: 'income' as const,
        total: stats.total,
        count: stats.count,
        sharePercent: totalIncome > 0 ? (stats.total / totalIncome) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const expenseByCategory: CategorySummaryItem[] = Array.from(expGroup.entries())
    .map(([categoryId, stats]) => {
      const tag = tagMap.get(categoryId);
      return {
        categoryId,
        categoryName: tag?.name || '未分类支出',
        color: tag?.color || '#475569',
        type: 'fixed_expense' as const,
        total: stats.total,
        count: stats.count,
        sharePercent: totalExpense > 0 ? (stats.total / totalExpense) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const disposableIncome = totalIncome - totalExpense;
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const disposableRate = totalIncome > 0 ? (disposableIncome / totalIncome) * 100 : 0;

  const prevMonthKey = getPreviousMonthKey(monthKey);
  const prevYearKey = String(Number(yearKey) - 1);
  let prevScoped = filterEntriesByPeriod(allEntries, periodMode, prevMonthKey, prevYearKey);
  if (categoryFilterIds && categoryFilterIds.length > 0) {
    const allowed = new Set(categoryFilterIds);
    prevScoped = prevScoped.filter((e) => allowed.has(e.categoryId));
  }

  let previousIncome: number | undefined;
  let previousExpense: number | undefined;
  let previousDisposable: number | undefined;

  if (prevScoped.length > 0) {
    previousIncome = prevScoped
      .filter((e) => e.type === 'income')
      .reduce((acc, cur) => acc + cur.amount, 0);
    previousExpense = prevScoped
      .filter((e) => e.type === 'fixed_expense')
      .reduce((acc, cur) => acc + cur.amount, 0);
    previousDisposable = previousIncome - previousExpense;
  }

  return {
    periodLabel: formatPeriodLabel(periodMode, monthKey, yearKey),
    totalIncome,
    totalExpense,
    paidExpense,
    pendingExpense,
    disposableIncome,
    expenseRatio,
    disposableRate,
    incomeCount,
    expenseCount,
    incomeByCategory,
    expenseByCategory,
    previousIncome,
    previousExpense,
    previousDisposable,
  };
}

export function computeAnnualTrend(
  allEntries: LedgerEntry[],
  yearKey: string,
  categoryFilterIds?: string[]
): MonthlyTrendPoint[] {
  const allowed =
    categoryFilterIds && categoryFilterIds.length > 0 ? new Set(categoryFilterIds) : null;

  const points: MonthlyTrendPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    const monthKey = `${yearKey}-${mm}`;
    let income = 0;
    let expense = 0;

    for (const entry of allEntries) {
      if (!entry.date.startsWith(monthKey)) continue;
      if (allowed && !allowed.has(entry.categoryId)) continue;
      if (entry.type === 'income') income += entry.amount;
      else expense += entry.amount;
    }

    points.push({
      monthKey,
      label: `${m}月`,
      income,
      expense,
      disposableIncome: income - expense,
    });
  }

  return points;
}

export function computeMemberBreakdown(
  entries: LedgerEntry[]
): { member: string; income: number; expense: number }[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (const e of entries) {
    const cur = map.get(e.member) || { income: 0, expense: 0 };
    if (e.type === 'income') cur.income += e.amount;
    else cur.expense += e.amount;
    map.set(e.member, cur);
  }
  return Array.from(map.entries())
    .map(([member, vals]) => ({ member, ...vals }))
    .sort((a, b) => b.income + b.expense - (a.income + a.expense));
}

// --- Month-End Asset & Credit/Loan Snapshot Analytics ---

export function computeAssetSnapshotSummary(
  allAssets: AssetAccountItem[],
  monthKey: string
): AssetSnapshotSummary {
  const metaMap = new Map(ASSET_CATEGORY_META.map((m) => [m.category, m]));
  const scoped = allAssets.filter((a) => a.monthKey === monthKey);

  let totalAssets = 0;
  let totalLiabilities = 0;
  let creditCardSpent = 0;
  let creditCardLimit = 0;
  let loanTotal = 0;
  let assetCount = 0;
  let liabilityCount = 0;

  const assetGroup = new Map<AssetCategory, { total: number; count: number }>();
  const liabGroup = new Map<AssetCategory, { total: number; count: number }>();

  for (const item of scoped) {
    if (item.direction === 'asset') {
      totalAssets += item.amount;
      assetCount += 1;
      const cur = assetGroup.get(item.category) || { total: 0, count: 0 };
      cur.total += item.amount;
      cur.count += 1;
      assetGroup.set(item.category, cur);
    } else {
      totalLiabilities += item.amount;
      liabilityCount += 1;
      if (item.category === '信用卡支出额度') {
        creditCardSpent += item.amount;
        creditCardLimit += item.creditLimit || 0;
      } else {
        loanTotal += item.amount;
      }
      const cur = liabGroup.get(item.category) || { total: 0, count: 0 };
      cur.total += item.amount;
      cur.count += 1;
      liabGroup.set(item.category, cur);
    }
  }

  const assetsByCategory: AssetCategoryBreakdownItem[] = Array.from(assetGroup.entries())
    .map(([category, stats]) => ({
      category,
      direction: 'asset' as const,
      color: metaMap.get(category)?.color || '#0F766E',
      total: stats.total,
      count: stats.count,
      sharePercent: totalAssets > 0 ? (stats.total / totalAssets) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const liabilitiesByCategory: AssetCategoryBreakdownItem[] = Array.from(liabGroup.entries())
    .map(([category, stats]) => ({
      category,
      direction: 'liability' as const,
      color: metaMap.get(category)?.color || '#DC2626',
      total: stats.total,
      count: stats.count,
      sharePercent: totalLiabilities > 0 ? (stats.total / totalLiabilities) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const prevKey = getPreviousMonthKey(monthKey);
  const prevScoped = allAssets.filter((a) => a.monthKey === prevKey);
  let previousNetAssets: number | undefined;
  if (prevScoped.length > 0) {
    const prevAssets = prevScoped
      .filter((a) => a.direction === 'asset')
      .reduce((acc, cur) => acc + cur.amount, 0);
    const prevLiabs = prevScoped
      .filter((a) => a.direction === 'liability')
      .reduce((acc, cur) => acc + cur.amount, 0);
    previousNetAssets = prevAssets - prevLiabs;
  }

  return {
    monthKey,
    totalAssets,
    totalLiabilities,
    netMonetaryAssets: totalAssets - totalLiabilities,
    creditCardSpent,
    creditCardLimit,
    creditCardUtilization: creditCardLimit > 0 ? (creditCardSpent / creditCardLimit) * 100 : 0,
    loanTotal,
    assetCount,
    liabilityCount,
    assetsByCategory,
    liabilitiesByCategory,
    previousNetAssets,
  };
}

export function computeAssetAnnualTrend(
  allAssets: AssetAccountItem[],
  yearKey: string
): AssetMonthTrendPoint[] {
  const points: AssetMonthTrendPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthKey = `${yearKey}-${String(m).padStart(2, '0')}`;
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const item of allAssets) {
      if (item.monthKey !== monthKey) continue;
      if (item.direction === 'asset') totalAssets += item.amount;
      else totalLiabilities += item.amount;
    }

    points.push({
      monthKey,
      label: `${m}月`,
      totalAssets,
      totalLiabilities,
      netAssets: totalAssets - totalLiabilities,
    });
  }
  return points;
}

export interface CreditCardProfile {
  key: string;
  name: string;
  institution: string;
  creditLimit?: number;
  member: string;
  sourceMonthKey: string;
  notes?: string;
}

export function getCreditCardProfiles(
  allAssets: AssetAccountItem[],
  targetMonthKey?: string
): CreditCardProfile[] {
  const cards = allAssets.filter(
    (a) => a.direction === 'liability' && a.category === '信用卡支出额度'
  );
  const grouped = new Map<string, AssetAccountItem[]>();
  for (const item of cards) {
    const key = `${item.institution.trim()}::${item.name.trim()}`;
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  }

  const pickBest = (list: AssetAccountItem[]): AssetAccountItem => {
    const sorted = [...list].sort((a, b) => {
      const aHasLimit = a.creditLimit && a.creditLimit > 0 ? 1 : 0;
      const bHasLimit = b.creditLimit && b.creditLimit > 0 ? 1 : 0;
      if (aHasLimit !== bHasLimit) return bHasLimit - aHasLimit;

      if (targetMonthKey) {
        const distA = Math.abs(getMonthDistance(a.monthKey, targetMonthKey));
        const distB = Math.abs(getMonthDistance(b.monthKey, targetMonthKey));
        if (distA !== distB) return distA - distB;
        // Equidistant: prefer earlier month first
        if (a.monthKey !== b.monthKey) return a.monthKey.localeCompare(b.monthKey);
      }

      return b.monthKey.localeCompare(a.monthKey) || b.updatedAt.localeCompare(a.updatedAt);
    });
    return sorted[0];
  };

  return Array.from(grouped.entries())
    .map(([key, list]) => {
      const best = pickBest(list);
      return {
        key,
        name: best.name,
        institution: best.institution,
        creditLimit: best.creditLimit && best.creditLimit > 0 ? best.creditLimit : undefined,
        member: best.member,
        sourceMonthKey: best.monthKey,
        notes: best.notes,
      };
    })
    .sort((a, b) => {
      if (targetMonthKey) {
        const distA = Math.abs(getMonthDistance(a.sourceMonthKey, targetMonthKey));
        const distB = Math.abs(getMonthDistance(b.sourceMonthKey, targetMonthKey));
        if (distA !== distB) return distA - distB;
      }
      return a.institution.localeCompare(b.institution) || a.name.localeCompare(b.name);
    });
}

export function resolveCreditLimitForCard(
  allAssets: AssetAccountItem[],
  targetMonthKey: string,
  name: string,
  institution: string
): { creditLimit: number; sourceMonthKey: string } | null {
  const cleanName = name.trim().toLowerCase();
  const cleanInst = institution.trim().toLowerCase();
  if (!cleanName && !cleanInst) return null;

  const candidates = allAssets.filter(
    (a) =>
      a.direction === 'liability' &&
      a.category === '信用卡支出额度' &&
      a.creditLimit !== undefined &&
      a.creditLimit > 0 &&
      a.monthKey !== targetMonthKey
  );
  if (candidates.length === 0) return null;

  const scoreMatch = (item: AssetAccountItem): number => {
    const iName = item.name.trim().toLowerCase();
    const iInst = item.institution.trim().toLowerCase();
    if (cleanName && cleanInst && iName === cleanName && iInst === cleanInst) return 3;
    if (cleanName && iName === cleanName) return 2;
    if (cleanInst && iInst === cleanInst) return 1;
    return 0;
  };

  const matched = candidates
    .map((item) => ({ item, score: scoreMatch(item) }))
    .filter((x) => x.score > 0);

  if (matched.length === 0) return null;

  // If only institution matched (score === 1) and there are multiple distinct cards under that bank with different limits,
  // only auto-infer when there's a clear single card or identical limit for that bank.
  const bestScore = Math.max(...matched.map((m) => m.score));
  const topMatches = matched.filter((m) => m.score === bestScore);
  if (bestScore === 1) {
    const uniqueLimits = new Set(topMatches.map((m) => m.item.creditLimit));
    if (uniqueLimits.size > 1) return null;
  }

  topMatches.sort((a, b) => {
    const distA = Math.abs(getMonthDistance(a.item.monthKey, targetMonthKey));
    const distB = Math.abs(getMonthDistance(b.item.monthKey, targetMonthKey));
    if (distA !== distB) return distA - distB;
    if (a.item.monthKey !== b.item.monthKey) return a.item.monthKey.localeCompare(b.item.monthKey);
    return b.item.updatedAt.localeCompare(a.item.updatedAt);
  });

  const best = topMatches[0].item;
  return {
    creditLimit: best.creditLimit as number,
    sourceMonthKey: best.monthKey,
  };
}

export function findNearestCopyableMonth(
  allAssets: AssetAccountItem[],
  targetMonthKey: string
): string | null {
  const existingSigs = new Set(
    allAssets
      .filter((a) => a.monthKey === targetMonthKey)
      .map((a) => `${a.direction}::${a.name}`)
  );

  const monthsWithMissing = new Set<string>();
  for (const item of allAssets) {
    if (item.monthKey === targetMonthKey) continue;
    const sig = `${item.direction}::${item.name}`;
    if (!existingSigs.has(sig)) {
      monthsWithMissing.add(item.monthKey);
    }
  }

  if (monthsWithMissing.size === 0) return null;

  const prevKey = getPreviousMonthKey(targetMonthKey);
  if (monthsWithMissing.has(prevKey)) return prevKey;

  const nextKey = getNextMonthKey(targetMonthKey);
  if (monthsWithMissing.has(nextKey)) return nextKey;

  return Array.from(monthsWithMissing).sort((a, b) => {
    const distA = Math.abs(getMonthDistance(a, targetMonthKey));
    const distB = Math.abs(getMonthDistance(b, targetMonthKey));
    if (distA !== distB) return distA - distB;
    return a.localeCompare(b);
  })[0];
}


export function buildCsvReport(
  report: SummaryReport,
  entries: LedgerEntry[],
  tags: CategoryTag[]
): string {
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));
  const escapeCsv = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines: string[] = [];
  lines.push(`家庭收支汇总报表,${escapeCsv(report.periodLabel)}`);
  lines.push('');
  lines.push('一、核心收支指标汇总');
  lines.push('指标项目,金额(元),占比/说明');
  lines.push(`家庭总收入,${report.totalIncome.toFixed(2)},共 ${report.incomeCount} 笔`);
  lines.push(
    `硬性固定支出,${report.totalExpense.toFixed(2)},占总收入 ${report.expenseRatio.toFixed(1)}%`
  );
  lines.push(`其中已扣款支出,${report.paidExpense.toFixed(2)},已确认支付`);
  lines.push(`其中待扣款支出,${report.pendingExpense.toFixed(2)},待扣款/预留`);
  lines.push(
    `可支配收入,${report.disposableIncome.toFixed(2)},可支配比例 ${report.disposableRate.toFixed(1)}%`
  );

  lines.push('');
  lines.push('二、按分类标签汇总');
  lines.push('收支方向,分类标签,笔数,合计金额(元),占同类比例(%)');
  for (const item of report.incomeByCategory) {
    lines.push(
      `家庭收入,${escapeCsv(item.categoryName)},${item.count},${item.total.toFixed(2)},${item.sharePercent.toFixed(1)}%`
    );
  }
  for (const item of report.expenseByCategory) {
    lines.push(
      `硬性支出,${escapeCsv(item.categoryName)},${item.count},${item.total.toFixed(2)},${item.sharePercent.toFixed(1)}%`
    );
  }

  lines.push('');
  lines.push('三、收支明细账目');
  lines.push('日期,收支类型,项目名称,分类标签,家庭成员,金额(元),状态,备注');
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    const typeLabel = e.type === 'income' ? '家庭收入' : '硬性支出';
    const statusLabel =
      e.type === 'income'
        ? e.status === 'paid'
          ? '已入账'
          : '待入账'
        : e.status === 'paid'
          ? '已扣款'
          : '待扣款';
    lines.push(
      [
        e.date,
        typeLabel,
        escapeCsv(e.title),
        escapeCsv(tagMap.get(e.categoryId) || '未分类'),
        escapeCsv(e.member),
        e.amount.toFixed(2),
        statusLabel,
        escapeCsv(e.notes || ''),
      ].join(',')
    );
  }

  return '\uFEFF' + lines.join('\r\n');
}
