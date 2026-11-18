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
    <div className="space-y-6">
      {/* Monthly Recurring Template Quick Sync Prompt */}
      {periodMode === 'month' && missingTemplatesForMonth.length > 0 && (
        <div className="bg-white border border-teal-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <CalendarCheck2 className="w-5 h-5 text-teal-700 shrink-0" />
            <div className="text-sm text-slate-800">
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
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            一键登记本月固定开支
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="核心收支指标">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{report.periodLabel} · 家庭总收入</div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {formatCurrency(report.totalIncome)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span>{report.incomeCount} 笔入账</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">{formatDelta(report.totalIncome, report.previousIncome)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{report.periodLabel} · 硬性固定支出</div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {formatCurrency(report.totalExpense)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span>{report.expenseCount} 项支出</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              待扣 {formatCurrency(report.pendingExpense)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {report.periodLabel} · 可支配收入
          </div>
          <div
            className={`mt-2 font-mono-num text-2xl font-bold ${
              report.disposableIncome >= 0 ? 'text-teal-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(report.disposableIncome, true)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span>可支配比例 {formatPercent(report.disposableRate)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              {formatDelta(report.disposableIncome, report.previousDisposable)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">硬性支出占收入比</div>
          <div
            className={`mt-2 font-mono-num text-2xl font-bold ${
              report.expenseRatio > 70
                ? 'text-red-600'
                : report.expenseRatio > 50
                  ? 'text-amber-700'
                  : 'text-slate-900'
            }`}
          >
            {formatPercent(report.expenseRatio)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span>
              {report.totalIncome === 0
                ? '暂无收入对照'
                : report.expenseRatio <= 50
                  ? '处于稳健区间（≤50%）'
                  : report.expenseRatio <= 70
                    ? '偏高区间（50%–70%）'
                    : '警戒区间（＞70%）'}
            </span>
          </div>
        </div>
      </section>

      {/* Month-End Monetary Assets & Credit/Loans Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-start gap-3">
          <Landmark className="w-5 h-5 text-teal-700 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-900">
              {assetSummary.monthKey} 月底家庭资产借贷盘点
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              统计储蓄卡余额、货币基金、积存金、股票账户，及信用卡支出额度与借贷账务
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div>
            <div className="text-[11px] text-slate-500">货币资产总计</div>
            <div className="font-mono-num text-sm font-bold text-teal-700 mt-0.5">
              {formatCurrency(assetSummary.totalAssets)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">借贷与信用卡待还</div>
            <div className="font-mono-num text-sm font-bold text-red-600 mt-0.5">
              {formatCurrency(assetSummary.totalLiabilities)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">净货币资产</div>
            <div className="font-mono-num text-sm font-bold text-slate-900 mt-0.5">
              {formatCurrency(assetSummary.netMonetaryAssets)}
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateAssets}
            className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>管理资产借贷</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Main Charts Row: 7 + 5 columns */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
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
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
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
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {entry.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
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

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-num text-sm font-semibold text-slate-900">
                        {formatCurrency(entry.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleEntryStatus(entry.id)}
                        className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap"
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
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
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
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              <span>完整报表与明细</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentEntries.length === 0 ? (
            <div className="p-10 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-slate-700">当前周期尚无收支记录</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                点击右上角「记一笔」手工录入，或在左侧导入 Excel 账本数据
              </p>
              <button
                type="button"
                onClick={onOpenAddEntry}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
              >
                登记第一笔记录
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
          )}
        </div>
      </section>
    </div>
  );
};
