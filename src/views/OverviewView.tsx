import React from 'react';
import { ArrowRight, CalendarCheck2, Check, Clock, Landmark, Pencil } from 'lucide-react';
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
  onOpenAddEntry,
  onNavigateReports,
  onNavigateAssets,
  onSelectMonth,
}) => {
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const missingTotal = missingTemplatesForMonth.reduce((acc, t) => acc + t.amount, 0);

  const pendingFixed = scopedEntries
    .filter((e) => e.type === 'fixed_expense' && e.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date));

  const recentEntries = [...scopedEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Monthly Recurring Template Quick Sync Prompt */}
      {periodMode === 'month' && missingTemplatesForMonth.length > 0 && (
        <div className="bg-white border border-teal-200 rounded-xl p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <CalendarCheck2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed">
              <span className="font-semibold">{selectedMonth}</span> 尚有{' '}
              <span className="font-mono-num font-semibold text-teal-800">
                {missingTemplatesForMonth.length}
              </span>{' '}
              项每月固定开支模板未登记（预计{' '}
              <span className="font-mono-num font-semibold text-slate-900">
                {formatCurrency(missingTotal)}
              </span>
              ）
            </div>
          </div>
          <button
            type="button"
            onClick={() => onGenerateMonthTemplates(selectedMonth)}
            className="w-full sm:w-auto min-h-[42px] sm:min-h-[36px] px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            一键登记本月固定开支
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip (2x2 on mobile) */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4" aria-label="核心收支指标">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {report.periodLabel} · 总收入
          </div>
          <div className="mt-1.5 sm:mt-2 font-mono-num text-lg sm:text-2xl font-bold text-slate-900 truncate">
            {formatCurrency(report.totalIncome)}
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>{report.incomeCount} 笔入账</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="font-mono-num truncate">{formatDelta(report.totalIncome, report.previousIncome)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {report.periodLabel} · 硬性支出
          </div>
          <div className="mt-1.5 sm:mt-2 font-mono-num text-lg sm:text-2xl font-bold text-slate-900 truncate">
            {formatCurrency(report.totalExpense)}
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>{report.expenseCount} 项</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num truncate">
              待扣 {formatCurrency(report.pendingExpense)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {report.periodLabel} · 可支配收入
          </div>
          <div
            className={`mt-1.5 sm:mt-2 font-mono-num text-lg sm:text-2xl font-bold truncate ${
              report.disposableIncome >= 0 ? 'text-teal-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(report.disposableIncome, true)}
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>比例 {formatPercent(report.disposableRate)}</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="font-mono-num hidden sm:inline">
              {formatDelta(report.disposableIncome, report.previousDisposable)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">硬性支出占比</div>
          <div
            className={`mt-1.5 sm:mt-2 font-mono-num text-lg sm:text-2xl font-bold ${
              report.expenseRatio > 70
                ? 'text-red-600'
                : report.expenseRatio > 50
                  ? 'text-amber-700'
                  : 'text-slate-900'
            }`}
          >
            {formatPercent(report.expenseRatio)}
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 truncate">
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
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-start gap-3">
          <Landmark className="w-5 h-5 text-teal-700 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-900">
              {assetSummary.monthKey} 月底家庭资产借贷盘点
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              统计储蓄卡、货币基金、积存金、股票，及借贷与信用卡支出额度
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-8 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div>
              <div className="text-[11px] text-slate-500">货币资产</div>
              <div className="font-mono-num text-xs sm:text-sm font-bold text-teal-700 mt-0.5 truncate">
                {formatCurrency(assetSummary.totalAssets)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">借贷与信用</div>
              <div
                className={`font-mono-num text-xs sm:text-sm font-bold mt-0.5 truncate ${
                  assetSummary.totalLiabilities < 0 ? 'text-teal-700' : 'text-red-600'
                }`}
              >
                {formatCurrency(assetSummary.totalLiabilities)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">净货币资产</div>
              <div className="font-mono-num text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">
                {formatCurrency(assetSummary.netMonetaryAssets)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateAssets}
            className="w-full sm:w-auto min-h-[42px] sm:min-h-[34px] inline-flex items-center justify-center gap-1 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>管理资产借贷</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Main Charts Row: 7 + 5 columns */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-stretch">
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
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                待扣款硬性支出提醒
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
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
            <div className="p-8 text-center text-xs text-slate-500 flex-1 flex flex-col items-center justify-center">
              <Check className="w-6 h-6 text-teal-600 mb-2" />
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
                    className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {entry.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono-num">{entry.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-xs inline-block"
                            style={{ backgroundColor: tag?.color || '#64748B' }}
                          />
                          {tag?.name || '未分类'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.member}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                      <span className="font-mono-num text-sm font-semibold text-slate-900">
                        {formatCurrency(entry.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleEntryStatus(entry.id)}
                        className="min-h-[38px] sm:min-h-[30px] px-3 sm:px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap"
                      >
                        标记已扣
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                近期收支明细
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {report.periodLabel} 已登记的收入与硬性开支
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateReports}
              className="min-h-[36px] inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              <span>完整报表</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentEntries.length === 0 ? (
            <div className="p-8 sm:p-10 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-slate-700">当前周期尚无收支记录</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                点击右上角「记一笔」手工录入，或在菜单中导入 Excel 账本数据
              </p>
              <button
                type="button"
                onClick={onOpenAddEntry}
                className="min-h-[42px] sm:min-h-[36px] px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
              >
                登记第一笔记录
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-100">
                {recentEntries.map((entry) => {
                  const tag = tagMap.get(entry.categoryId);
                  const isInc = entry.type === 'income';
                  return (
                    <div key={entry.id} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {entry.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono-num">{entry.date}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-xs shrink-0"
                                style={{ backgroundColor: tag?.color || '#64748B' }}
                              />
                              <span>{tag?.name || '未分类'}</span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{entry.member}</span>
                          </div>
                        </div>
                        <div
                          className={`font-mono-num text-sm font-semibold whitespace-nowrap shrink-0 ${
                            isInc ? 'text-teal-700' : 'text-slate-900'
                          }`}
                        >
                          {isInc ? '+' : '-'}
                          {formatCurrency(entry.amount)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => onToggleEntryStatus(entry.id)}
                          className={`min-h-[34px] inline-flex items-center gap-1 text-xs font-medium ${
                            entry.status === 'paid' ? 'text-teal-700' : 'text-amber-700'
                          }`}
                        >
                          {entry.status === 'paid' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isInc
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
                          className="min-h-[34px] px-2.5 inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>编辑</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                      <th className="py-2.5 px-4">日期</th>
                      <th className="py-2.5 px-4">项目名称</th>
                      <th className="py-2.5 px-4">分类标签</th>
                      <th className="py-2.5 px-4">状态</th>
                      <th className="py-2.5 px-4 text-right">金额</th>
                      <th className="py-2.5 px-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {recentEntries.map((entry) => {
                      const tag = tagMap.get(entry.categoryId);
                      const isInc = entry.type === 'income';
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors h-10">
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
                                {isInc
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
                              isInc ? 'text-teal-700' : 'text-slate-900'
                            }`}
                          >
                            {isInc ? '+' : '-'}
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="py-2 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onEditEntry(entry)}
                              className="p-1 text-slate-400 hover:text-slate-800 rounded"
                              aria-label="编辑记录"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
