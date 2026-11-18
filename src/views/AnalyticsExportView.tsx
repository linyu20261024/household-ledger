import React, { useMemo, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Printer } from 'lucide-react';
import {
  AssetTrendChart,
  CategoryBreakdownChart,
  CashflowTrendChart,
  MemberContributionChart,
} from '../components/Charts';
import {
  AssetAccountItem,
  CategoryTag,
  LedgerEntry,
  PeriodMode,
  SummaryReport,
} from '../types/ledger';
import {
  buildCsvReport,
  computeAnnualTrend,
  computeAssetAnnualTrend,
  computeMemberBreakdown,
  computeSummaryReport,
  filterEntriesByPeriod,
} from '../utils/analytics';
import { downloadTextFile, formatCurrency, formatPercent } from '../utils/formatters';

interface AnalyticsExportViewProps {
  allEntries: LedgerEntry[];
  allAssets: AssetAccountItem[];
  tags: CategoryTag[];
  periodMode: PeriodMode;
  selectedMonth: string;
  selectedYear: string;
  availableYears: string[];
  onChangePeriodMode: (mode: PeriodMode) => void;
  onChangeMonth: (month: string) => void;
  onChangeYear: (year: string) => void;
  onExportExcel: (report: SummaryReport, entries: LedgerEntry[]) => void;
}

export const AnalyticsExportView: React.FC<AnalyticsExportViewProps> = ({
  allEntries,
  allAssets,
  tags,
  periodMode,
  selectedMonth,
  selectedYear,
  availableYears,
  onChangePeriodMode,
  onChangeMonth,
  onChangeYear,
  onExportExcel,
}) => {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const scopedEntries = useMemo(() => {
    let base = filterEntriesByPeriod(allEntries, periodMode, selectedMonth, selectedYear);
    if (selectedTagIds.length > 0) {
      const allowed = new Set(selectedTagIds);
      base = base.filter((e) => allowed.has(e.categoryId));
    }
    return base;
  }, [allEntries, periodMode, selectedMonth, selectedYear, selectedTagIds]);

  const report = useMemo(
    () =>
      computeSummaryReport(
        allEntries,
        tags,
        periodMode,
        selectedMonth,
        selectedYear,
        selectedTagIds
      ),
    [allEntries, tags, periodMode, selectedMonth, selectedYear, selectedTagIds]
  );

  const annualTrend = useMemo(
    () => computeAnnualTrend(allEntries, selectedYear, selectedTagIds),
    [allEntries, selectedYear, selectedTagIds]
  );

  const assetAnnualTrend = useMemo(
    () => computeAssetAnnualTrend(allAssets, selectedYear),
    [allAssets, selectedYear]
  );

  const memberData = useMemo(() => computeMemberBreakdown(scopedEntries), [scopedEntries]);

  const handleExportCsv = () => {
    const csv = buildCsvReport(report, scopedEntries, tags);
    downloadTextFile(
      `家庭收支分析报表_${report.periodLabel.replace(/\s+/g, '')}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      periodMode,
      periodLabel: report.periodLabel,
      filteredCategoryIds: selectedTagIds,
      summary: report,
      monthlyTrend: annualTrend,
      assetTrend: assetAnnualTrend,
      memberBreakdown: memberData,
      entries: scopedEntries,
    };
    downloadTextFile(
      `家庭收支分析数据_${report.periodLabel.replace(/\s+/g, '')}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 print-full">
      {/* Analytics Period & Export Toolbar */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 sm:space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => onChangePeriodMode('month')}
                className={`px-3 py-1.5 min-h-[34px] sm:min-h-0 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  periodMode === 'month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                按月分析
              </button>
              <button
                type="button"
                onClick={() => onChangePeriodMode('year')}
                className={`px-3 py-1.5 min-h-[34px] sm:min-h-0 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  periodMode === 'year'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                按年分析
              </button>
            </div>

            {periodMode === 'month' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) onChangeMonth(e.target.value);
                }}
                aria-label="选择分析月份"
                className="h-10 sm:h-9 px-3 text-base sm:text-xs font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => onChangeYear(e.target.value)}
                aria-label="选择分析年份"
                className="h-10 sm:h-9 px-3 text-base sm:text-xs font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y} 年度
                  </option>
                ))}
              </select>
            )}

            <span className="text-xs text-slate-500">
              正在分析：<strong className="text-slate-900">{report.periodLabel}</strong>
              {selectedTagIds.length > 0 && `（已选 ${selectedTagIds.length} 个分类标签）`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => onExportExcel(report, scopedEntries)}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>导出 {periodMode === 'month' ? '月度' : '年度'} Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>导出 CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-slate-500" />
              <span>导出 JSON</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>打印图表报告</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap pt-3 border-t border-slate-100 no-print">
          <span className="text-xs text-slate-500 shrink-0 mr-0.5">分类聚焦：</span>
          <button
            type="button"
            onClick={() => setSelectedTagIds([])}
            className={`shrink-0 min-h-[36px] sm:min-h-0 px-3 sm:px-2.5 py-1.5 sm:py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
              selectedTagIds.length === 0
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            全部分类
          </button>
          {tags.map((tag) => {
            const active = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-0 px-3 sm:px-2.5 py-1.5 sm:py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-teal-700 text-white font-medium'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: active ? '#FFFFFF' : tag.color }}
                />
                <span>{tag.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Monthly Granularity Trend Chart */}
      <CashflowTrendChart
        periodMode={periodMode}
        periodLabel={report.periodLabel}
        yearKey={selectedYear}
        activeMonthKey={selectedMonth}
        annualData={annualTrend}
        onSelectMonthPoint={(mKey) => {
          onChangeMonth(mKey);
          onChangePeriodMode('month');
        }}
      />

      {/* Split Charts: Category Breakdown + Member Contribution */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        <div className="xl:col-span-6">
          <CategoryBreakdownChart
            periodLabel={report.periodLabel}
            incomeItems={report.incomeByCategory}
            expenseItems={report.expenseByCategory}
            totalIncome={report.totalIncome}
            totalExpense={report.totalExpense}
          />
        </div>
        <div className="xl:col-span-6">
          <MemberContributionChart
            periodLabel={report.periodLabel}
            memberData={memberData}
            expenseRatio={report.expenseRatio}
            disposableRate={report.disposableRate}
          />
        </div>
      </section>

      {/* Month-End Asset & Credit/Loan Annual Trend */}
      <AssetTrendChart
        yearKey={selectedYear}
        activeMonthKey={periodMode === 'month' ? selectedMonth : undefined}
        data={assetAnnualTrend}
        onSelectMonth={(mKey) => {
          onChangeMonth(mKey);
          onChangePeriodMode('month');
        }}
      />

      {/* Monthly Comparison Table / Mobile Cards */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              {selectedYear} 年度逐月收支与可支配收入对照表
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              点击任意月份可切换至该月份按月分析视图
            </p>
          </div>
          <span className="font-mono-num text-xs text-slate-500">
            当期可支配收入 {formatCurrency(report.disposableIncome, true)}
          </span>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {annualTrend.map((row) => {
            const ratio = row.income > 0 ? (row.expense / row.income) * 100 : 0;
            const isSelected = periodMode === 'month' && selectedMonth === row.monthKey;
            return (
              <button
                key={row.monthKey}
                type="button"
                onClick={() => {
                  onChangeMonth(row.monthKey);
                  onChangePeriodMode('month');
                }}
                className={`w-full text-left p-4 transition-colors ${
                  isSelected ? 'bg-teal-50/70' : 'active:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-num text-sm font-semibold text-slate-900">
                    {row.monthKey}（{row.label}）
                  </span>
                  <span className="font-mono-num text-xs text-slate-500">
                    硬性占比 {row.income > 0 ? formatPercent(ratio) : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">总收入</div>
                    <div className="font-mono-num font-medium text-teal-700 mt-0.5">
                      {formatCurrency(row.income)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">硬性支出</div>
                    <div className="font-mono-num font-medium text-slate-900 mt-0.5">
                      {formatCurrency(row.expense)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">可支配收入</div>
                    <div
                      className={`font-mono-num font-semibold mt-0.5 ${
                        row.disposableIncome >= 0 ? 'text-sky-700' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(row.disposableIncome, true)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                <th className="py-2.5 px-5">月份</th>
                <th className="py-2.5 px-4 text-right">家庭总收入</th>
                <th className="py-2.5 px-4 text-right">硬性支出</th>
                <th className="py-2.5 px-4 text-right">当月可支配收入</th>
                <th className="py-2.5 px-5 text-right">硬性支出占比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {annualTrend.map((row) => {
                const ratio = row.income > 0 ? (row.expense / row.income) * 100 : 0;
                const isSelected = periodMode === 'month' && selectedMonth === row.monthKey;
                return (
                  <tr
                    key={row.monthKey}
                    onClick={() => {
                      onChangeMonth(row.monthKey);
                      onChangePeriodMode('month');
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-5 font-medium text-slate-900 font-mono-num">
                      {row.monthKey}（{row.label}）
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-teal-700 font-medium">
                      {formatCurrency(row.income)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-900">
                      {formatCurrency(row.expense)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono-num font-semibold ${
                        row.disposableIncome >= 0 ? 'text-sky-700' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(row.disposableIncome, true)}
                    </td>
                    <td className="py-2.5 px-5 text-right font-mono-num text-slate-600">
                      {row.income > 0 ? formatPercent(ratio) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
