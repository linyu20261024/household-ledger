import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarCheck2, Check, Clock, Landmark, Pencil, Search, Trash2, X } from 'lucide-react';
import {
  AssetSnapshotSummary,
  CategoryTag,
  FixedExpenseTemplate,
  LedgerEntry,
  MonthlyTrendPoint,
  PeriodMode,
  SummaryReport,
} from '../types/ledger';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { CategoryBreakdownChart, CashflowTrendChart } from '../components/Charts';

interface OverviewViewProps {
  periodMode: PeriodMode;
  selectedMonth: string;
  selectedYear: string;
  report: SummaryReport;
  assetSummary: AssetSnapshotSummary;
  annualTrend: MonthlyTrendPoint[];
  scopedEntries: LedgerEntry[];
  tags: CategoryTag[];
  missingTemplatesForMonth: FixedExpenseTemplate[];
  onGenerateMonthTemplates: (monthKey: string) => void;
  onToggleEntryStatus: (entryId: string) => void;
  onEditEntry: (entry: LedgerEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onOpenAddEntry: () => void;
  onNavigateReports: () => void;
  onNavigateAssets: () => void;
  onSelectMonth: (monthKey: string) => void;
}

function formatDelta(current: number, previous?: number): string {
  if (previous === undefined) return '无上期对比数据';
  if (previous === 0) return current === 0 ? '与上期持平' : '上期为 ¥0.00';
  const diff = current - previous;
  const pct = (diff / Math.abs(previous)) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `较上期 ${sign}${pct.toFixed(1)}%`;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  periodMode,
  selectedMonth,
  selectedYear,
  report,
  assetSummary,
  annualTrend,
  scopedEntries,
  tags,
  missingTemplatesForMonth,
  onGenerateMonthTemplates,
  onToggleEntryStatus,
  onEditEntry,
  onDeleteEntry,
  onOpenAddEntry,
  onNavigateReports,
  onNavigateAssets,
  onSelectMonth,
}) => {
  const [entrySearch, setEntrySearch] = useState('');
  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const missingTotal = missingTemplatesForMonth.reduce((acc, t) => acc + t.amount, 0);
  const missingHasVariable = missingTemplatesForMonth.some((t) => t.amountMode === 'variable');

  const pendingFixed = scopedEntries
    .filter((e) => e.type === 'fixed_expense' && e.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date));

  const {
    incomeList,
    expenseList,
    incomeTotalCount,
    expenseTotalCount,
    incomeTotalAmount,
    expenseTotalAmount,
    totalMatchedCount,
  } = useMemo(() => {
    const q = entrySearch.trim().toLowerCase();
    const matchesSearch = (e: LedgerEntry) => {
      if (!q) return true;
      const tagName = tagMap.get(e.categoryId)?.name || '';
      const hay = [e.title, tagName, e.member, e.notes || '', e.date].join(' ').toLowerCase();
      return hay.includes(q);
    };

    const byAmountDesc = (a: LedgerEntry, b: LedgerEntry) =>
      b.amount - a.amount || b.date.localeCompare(a.date);

    const incomes = scopedEntries
      .filter((e) => e.type === 'income' && matchesSearch(e))
      .sort(byAmountDesc);
    const expenses = scopedEntries
      .filter((e) => e.type === 'fixed_expense' && matchesSearch(e))
      .sort(byAmountDesc);

    const limit = q ? 24 : 15;
    return {
      incomeList: incomes.slice(0, limit),
      expenseList: expenses.slice(0, limit),
      incomeTotalCount: incomes.length,
      expenseTotalCount: expenses.length,
      incomeTotalAmount: incomes.reduce((acc, e) => acc + e.amount, 0),
      expenseTotalAmount: expenses.reduce((acc, e) => acc + e.amount, 0),
      totalMatchedCount: incomes.length + expenses.length,
    };
  }, [scopedEntries, entrySearch, tagMap]);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Monthly Recurring Template Quick Sync Prompt */}
      {periodMode === 'month' && missingTemplatesForMonth.length > 0 && (
        <div className="bg-white border border-teal-200 rounded-xl p-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <CalendarCheck2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs sm:text-sm text-slate-800 leading-snug">
              <span className="font-semibold">{selectedMonth}</span> 尚有{' '}
              <span className="font-mono-num font-semibold text-teal-800">
                {missingTemplatesForMonth.length}
              </span>{' '}
              项每月固定开支模板未登记（预计{' '}
              <span className="font-mono-num font-semibold text-slate-900">
                {formatCurrency(missingTotal)}
              </span>
              {missingHasVariable ? '，含浮动金额项' : ''}）
            </div>
          </div>
          <button
            type="button"
            onClick={() => onGenerateMonthTemplates(selectedMonth)}
            className="w-full sm:w-auto min-h-[36px] px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            一键登记本月固定开支
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip (2x2 on mobile) */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4" aria-label="核心收支指标">
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {report.periodLabel} · 总收入
          </div>
          <div className="mt-1 sm:mt-2 font-mono-num text-base sm:text-2xl font-bold text-slate-900 truncate">
            {formatCurrency(report.totalIncome)}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>{report.incomeCount} 笔入账</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="font-mono-num truncate">{formatDelta(report.totalIncome, report.previousIncome)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {report.periodLabel} · 硬性支出
          </div>
          <div className="mt-1 sm:mt-2 font-mono-num text-base sm:text-2xl font-bold text-slate-900 truncate">
            {formatCurrency(report.totalExpense)}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>{report.expenseCount} 项</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num truncate">
              待扣 {formatCurrency(report.pendingExpense)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {report.periodLabel} · 可支配收入
          </div>
          <div
            className={`mt-1 sm:mt-2 font-mono-num text-base sm:text-2xl font-bold truncate ${
              report.disposableIncome >= 0 ? 'text-teal-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(report.disposableIncome, true)}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>比例 {formatPercent(report.disposableRate)}</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="font-mono-num hidden sm:inline">
              {formatDelta(report.disposableIncome, report.previousDisposable)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">硬性支出占比</div>
          <div
            className={`mt-1 sm:mt-2 font-mono-num text-base sm:text-2xl font-bold ${
              report.expenseRatio > 70
                ? 'text-red-600'
                : report.expenseRatio > 50
                  ? 'text-amber-700'
                  : 'text-slate-900'
            }`}
          >
            {formatPercent(report.expenseRatio)}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 truncate">
            <span>
              {report.totalIncome === 0
                ? '暂无收入对照'
                : report.expenseRatio <= 50
                  ? '稳健区间（≤50%）'
                  : report.expenseRatio <= 70
                    ? '偏高区间（50%–70%）'
                    : '警戒区间（＞70%）'}
            </span>
          </div>
        </div>
      </section>

      {/* Month-End Monetary Assets & Credit/Loans Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-6">
        <div className="flex items-center sm:items-start gap-2.5 sm:gap-3">
          <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700 sm:mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900">
              {assetSummary.monthKey} 月底家庭资产借贷盘点
            </div>
            <div className="hidden sm:block text-xs text-slate-500 mt-0.5">
              统计储蓄卡、货币基金、积存金、股票、借出及应收款，及借贷与信用卡支出额度
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-8">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-8 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div>
              <div className="text-[10px] sm:text-[11px] text-slate-500">货币资产</div>
              <div className="font-mono-num text-xs sm:text-sm font-bold text-teal-700 mt-0.5 truncate">
                {formatCurrency(assetSummary.totalAssets)}
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] text-slate-500">借贷与信用</div>
              <div
                className={`font-mono-num text-xs sm:text-sm font-bold mt-0.5 truncate ${
                  assetSummary.totalLiabilities < 0 ? 'text-teal-700' : 'text-red-600'
                }`}
              >
                {formatCurrency(assetSummary.totalLiabilities)}
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] text-slate-500">净货币资产</div>
              <div className="font-mono-num text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">
                {formatCurrency(assetSummary.netMonetaryAssets)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateAssets}
            className="w-full sm:w-auto min-h-[34px] inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>管理资产借贷</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Main Charts Row: 7 + 5 columns */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-6 items-stretch">
        <div className="xl:col-span-7">
          <CashflowTrendChart
            periodMode={periodMode}
            periodLabel={report.periodLabel}
            yearKey={selectedYear}
            activeMonthKey={selectedMonth}
            annualData={annualTrend}
            onSelectMonthPoint={onSelectMonth}
          />
        </div>
        <div className="xl:col-span-5">
          <CategoryBreakdownChart
            periodLabel={report.periodLabel}
            incomeItems={report.incomeByCategory}
            expenseItems={report.expenseByCategory}
            totalIncome={report.totalIncome}
            totalExpense={report.totalExpense}
          />
        </div>
      </section>

      {/* Bottom Split: Pending Fixed Items + Recent Ledger */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-6">
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                待扣款硬性支出提醒
              </h3>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                {periodMode === 'month'
                  ? `${report.periodLabel} 尚未确认扣款的项目`
                  : `${report.periodLabel} 待处理固定账单`}
              </p>
            </div>
            <span className="font-mono-num text-xs font-semibold text-amber-700">
              {formatCurrency(report.pendingExpense)}
            </span>
          </div>

          {pendingFixed.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-xs text-slate-500 flex-1 flex flex-col items-center justify-center">
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 mb-1.5 sm:mb-2" />
              <p className="font-medium text-slate-700">
                {scopedEntries.length === 0 ? '暂无待扣款硬性支出' : '当前周期所有硬性支出已确认扣款'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingFixed.map((entry) => {
                const tag = tagMap.get(entry.categoryId);
                return (
                  <div
                    key={entry.id}
                    className="px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between gap-2.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] sm:text-sm font-medium text-slate-900 truncate">
                        {entry.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs text-slate-500 mt-0.5">
                        <span className="font-mono-num">{entry.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-xs inline-block"
                            style={{ backgroundColor: tag?.color || '#64748B' }}
                          />
                          {tag?.name || '未分类'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.member}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <span
                        className={`font-mono-num text-[13px] sm:text-sm font-semibold ${
                          entry.amount === 0 ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(entry.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleEntryStatus(entry.id)}
                        className="min-h-[28px] px-2 py-1 text-[11px] sm:text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap"
                      >
                        标记已扣
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditEntry(entry)}
                        className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-slate-800 active:bg-slate-100 rounded-md"
                        aria-label="编辑待扣项目"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-red-600 active:bg-red-50 rounded-md"
                        aria-label="删除本月此开支"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                近期收支明细
              </h3>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                {report.periodLabel} 收入与硬性开支分别列出（按金额从多到少排列）
              </p>
            </div>
            <div className="flex items-center gap-2">
              {scopedEntries.length > 0 && (
                <div className="relative flex-1 sm:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={entrySearch}
                    onChange={(e) => setEntrySearch(e.target.value)}
                    placeholder="检索账目名称/分类/成员..."
                    className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                  {entrySearch && (
                    <button
                      type="button"
                      onClick={() => setEntrySearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      aria-label="清空检索"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={onNavigateReports}
                className="min-h-[32px] inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0"
              >
                <span>完整报表</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {totalMatchedCount === 0 ? (
            scopedEntries.length > 0 && entrySearch.trim() ? (
              <div className="p-6 sm:p-8 text-center flex-1 flex flex-col items-center justify-center gap-2">
                <p className="text-xs text-slate-500">未找到包含「{entrySearch.trim()}」的收支记录</p>
                <button
                  type="button"
                  onClick={() => setEntrySearch('')}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  清空检索
                </button>
              </div>
            ) : (
              <div className="p-6 sm:p-10 text-center flex-1 flex flex-col items-center justify-center">
                <p className="text-sm font-medium text-slate-700">当前周期尚无收支记录</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  点击右上角「记一笔」手工录入，或在菜单中导入 Excel 账本数据
                </p>
                <button
                  type="button"
                  onClick={onOpenAddEntry}
                  className="min-h-[36px] px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
                >
                  登记第一笔记录
                </button>
              </div>
            )
          ) : (
            <div className="divide-y divide-slate-200">
              {(
                [
                  {
                    key: 'income',
                    title: '一、家庭收入',
                    isInc: true,
                    items: incomeList,
                    totalCount: incomeTotalCount,
                    totalAmount: incomeTotalAmount,
                    emptyText: entrySearch.trim() ? '无匹配收入记录' : '当前周期暂无收入记录',
                  },
                  {
                    key: 'fixed_expense',
                    title: '二、硬性支出',
                    isInc: false,
                    items: expenseList,
                    totalCount: expenseTotalCount,
                    totalAmount: expenseTotalAmount,
                    emptyText: entrySearch.trim() ? '无匹配支出记录' : '当前周期暂无硬性支出记录',
                  },
                ] as const
              ).map((group) => (
                <div key={group.key}>
                  <div
                    className={`px-3 sm:px-5 py-2 border-b border-slate-100 flex items-center justify-between gap-2 ${
                      group.isInc ? 'bg-teal-50/40' : 'bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs font-semibold ${
                          group.isInc ? 'text-teal-800' : 'text-slate-800'
                        }`}
                      >
                        {group.title}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono-num">
                        {group.totalCount} 笔 · 金额降序
                      </span>
                    </div>
                    <span
                      className={`font-mono-num text-xs font-bold whitespace-nowrap ${
                        group.isInc ? 'text-teal-700' : 'text-slate-900'
                      }`}
                    >
                      {group.isInc ? '+' : '-'}
                      {formatCurrency(group.totalAmount)}
                    </span>
                  </div>

                  {group.items.length === 0 ? (
                    <div className="px-3 sm:px-5 py-4 text-center text-xs text-slate-400">
                      {group.emptyText}
                    </div>
                  ) : (
                    <>
                      {/* Mobile Compact Rows */}
                      <div className="md:hidden divide-y divide-slate-100">
                        {group.items.map((entry) => {
                          const tag = tagMap.get(entry.categoryId);
                          return (
                            <div key={entry.id} className="px-3 py-2 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-xs shrink-0"
                                    style={{ backgroundColor: tag?.color || '#64748B' }}
                                  />
                                  <span className="text-[13px] font-medium text-slate-900 truncate">
                                    {entry.title}
                                  </span>
                                </div>
                                <div
                                  className={`font-mono-num text-[13px] font-semibold whitespace-nowrap shrink-0 ${
                                    group.isInc ? 'text-teal-700' : 'text-slate-900'
                                  }`}
                                >
                                  {group.isInc ? '+' : '-'}
                                  {formatCurrency(entry.amount)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[11px] text-slate-500 truncate min-w-0">
                                  <span className="font-mono-num">{entry.date.slice(5)}</span>
                                  <span className="mx-1 text-slate-300">·</span>
                                  <span>{tag?.name || '未分类'}</span>
                                  <span className="mx-1 text-slate-300">·</span>
                                  <span>{entry.member}</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onToggleEntryStatus(entry.id)}
                                    className={`px-1.5 py-0.5 inline-flex items-center gap-1 text-[11px] font-medium rounded ${
                                      entry.status === 'paid'
                                        ? 'text-teal-700 bg-teal-50/80'
                                        : 'text-amber-700 bg-amber-50'
                                    }`}
                                  >
                                    {entry.status === 'paid' ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <Clock className="w-3 h-3" />
                                    )}
                                    <span>
                                      {group.isInc
                                        ? entry.status === 'paid'
                                          ? '已入账'
                                          : '待入账'
                                        : entry.status === 'paid'
                                          ? '已扣款'
                                          : '待扣款'}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onEditEntry(entry)}
                                    className="w-7 h-7 inline-flex items-center justify-center text-slate-500 active:bg-slate-100 rounded-md"
                                    aria-label="编辑记录"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteEntry(entry.id)}
                                    className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-red-600 active:bg-red-50 rounded-md"
                                    aria-label="删除记录"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-white text-[11px] font-medium text-slate-500">
                              <th className="py-2 px-4">日期</th>
                              <th className="py-2 px-4">项目名称</th>
                              <th className="py-2 px-4">分类标签</th>
                              <th className="py-2 px-4">状态</th>
                              <th className="py-2 px-4 text-right">金额</th>
                              <th className="py-2 px-4 text-right">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {group.items.map((entry) => {
                              const tag = tagMap.get(entry.categoryId);
                              return (
                                <tr
                                  key={entry.id}
                                  className="hover:bg-slate-50/80 transition-colors h-10"
                                >
                                  <td className="py-2 px-4 font-mono-num text-slate-500 whitespace-nowrap">
                                    {entry.date}
                                  </td>
                                  <td className="py-2 px-4 font-medium text-slate-900 max-w-[180px] truncate">
                                    {entry.title}
                                  </td>
                                  <td className="py-2 px-4 text-slate-600 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span
                                        className="w-2 h-2 rounded-xs shrink-0"
                                        style={{ backgroundColor: tag?.color || '#64748B' }}
                                      />
                                      <span>{tag?.name || '未分类'}</span>
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => onToggleEntryStatus(entry.id)}
                                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                                        entry.status === 'paid'
                                          ? 'text-teal-700 hover:text-teal-900'
                                          : 'text-amber-700 hover:text-amber-900'
                                      }`}
                                    >
                                      {entry.status === 'paid' ? (
                                        <Check className="w-3.5 h-3.5" />
                                      ) : (
                                        <Clock className="w-3.5 h-3.5" />
                                      )}
                                      <span>
                                        {group.isInc
                                          ? entry.status === 'paid'
                                            ? '已入账'
                                            : '待入账'
                                          : entry.status === 'paid'
                                            ? '已扣款'
                                            : '待扣款'}
                                      </span>
                                    </button>
                                  </td>
                                  <td
                                    className={`py-2 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                                      group.isInc ? 'text-teal-700' : 'text-slate-900'
                                    }`}
                                  >
                                    {group.isInc ? '+' : '-'}
                                    {formatCurrency(entry.amount)}
                                  </td>
                                  <td className="py-2 px-4 text-right whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => onEditEntry(entry)}
                                        className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100"
                                        aria-label="编辑记录"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteEntry(entry.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                        aria-label="删除记录"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {group.totalCount > group.items.length && (
                        <div className="px-3 sm:px-5 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            已展示前 {group.items.length} 笔（共 {group.totalCount} 笔）
                          </span>
                          <button
                            type="button"
                            onClick={onNavigateReports}
                            className="text-teal-700 font-medium hover:underline"
                          >
                            查看全部明细 →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
