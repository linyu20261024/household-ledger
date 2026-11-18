import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Download,
  FileSpreadsheet,
  Pencil,
  Printer,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { DEFAULT_MEMBERS } from '../data/seedData';
import {
  CategoryTag,
  EntryType,
  LedgerEntry,
  PeriodMode,
  SummaryReport,
} from '../types/ledger';
import { buildCsvReport } from '../utils/analytics';
import { downloadTextFile, formatCurrency, formatPercent } from '../utils/formatters';

interface ReportLedgerViewProps {
  periodMode: PeriodMode;
  report: SummaryReport;
  scopedEntries: LedgerEntry[];
  tags: CategoryTag[];
  onToggleStatus: (id: string) => void;
  onEditEntry: (entry: LedgerEntry) => void;
  onDeleteEntry: (id: string) => void;
  onExportExcel: (filteredEntries: LedgerEntry[]) => void;
  onOpenExcelImport: () => void;
}

export const ReportLedgerView: React.FC<ReportLedgerViewProps> = ({
  report,
  scopedEntries,
  tags,
  onToggleStatus,
  onEditEntry,
  onDeleteEntry,
  onExportExcel,
  onOpenExcelImport,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EntryType>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [memberFilter, setMemberFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const toggleTagFilter = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedEntries
      .filter((e) => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (selectedTagIds.length > 0 && !selectedTagIds.includes(e.categoryId)) return false;
        if (memberFilter !== 'all' && e.member !== memberFilter) return false;
        if (statusFilter !== 'all' && e.status !== statusFilter) return false;
        if (q) {
          const tagName = tagMap.get(e.categoryId)?.name.toLowerCase() || '';
          const match =
            e.title.toLowerCase().includes(q) ||
            (e.notes || '').toLowerCase().includes(q) ||
            tagName.includes(q) ||
            e.member.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [scopedEntries, typeFilter, selectedTagIds, memberFilter, statusFilter, search, tagMap]);

  const filteredIncomeTotal = filteredEntries
    .filter((e) => e.type === 'income')
    .reduce((acc, e) => acc + e.amount, 0);
  const filteredExpenseTotal = filteredEntries
    .filter((e) => e.type === 'fixed_expense')
    .reduce((acc, e) => acc + e.amount, 0);

  const visibleTagsForFilter = useMemo(() => {
    if (typeFilter === 'all') return tags;
    return tags.filter((t) => t.type === typeFilter);
  }, [tags, typeFilter]);

  const handleExportCsv = () => {
    const csv = buildCsvReport(report, filteredEntries, tags);
    downloadTextFile(
      `家庭收支汇总报表_${report.periodLabel.replace(/\s+/g, '')}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
  };

  return (
    <div className="space-y-6 print-full">
      {/* Auto-Generated Summary Report Panel */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              {report.periodLabel} · 自动收支汇总报表
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              系统根据当前周期登记的家庭收入与硬性固定支出实时核算生成
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => onExportExcel(filteredEntries)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>导出 Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={onOpenExcelImport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>导入 Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>打印 / PDF</span>
            </button>
          </div>
        </div>

        {/* Summary Key Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/40">
          <div className="p-5">
            <div className="text-xs text-slate-500">本期家庭总收入</div>
            <div className="mt-1 font-mono-num text-lg font-bold text-teal-700">
              {formatCurrency(report.totalIncome)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">{report.incomeCount} 笔收入项目</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">本期硬性固定支出</div>
            <div className="mt-1 font-mono-num text-lg font-bold text-slate-900">
              {formatCurrency(report.totalExpense)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              已扣 {formatCurrency(report.paidExpense)} · 待扣 {formatCurrency(report.pendingExpense)}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">本期可支配收入</div>
            <div
              className={`mt-1 font-mono-num text-lg font-bold ${
                report.disposableIncome >= 0 ? 'text-slate-900' : 'text-red-600'
              }`}
            >
              {formatCurrency(report.disposableIncome, true)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              可支配比例 {formatPercent(report.disposableRate)}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">硬性支出占比</div>
            <div className="mt-1 font-mono-num text-lg font-bold text-slate-900">
              {formatPercent(report.expenseRatio)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">硬性固定支出 / 总收入</div>
          </div>
        </div>

        {/* Category Breakdown Two-Column Audit Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-800">一、收入分类汇总</h3>
              <span className="font-mono-num text-xs font-semibold text-teal-700">
                小计 {formatCurrency(report.totalIncome)}
              </span>
            </div>
            {report.incomeByCategory.length === 0 ? (
              <div className="py-6 text-xs text-slate-400 text-center">本期暂无收入分类记录</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 text-left font-medium">分类标签</th>
                    <th className="py-2 text-right font-medium">笔数</th>
                    <th className="py-2 text-right font-medium">占比</th>
                    <th className="py-2 text-right font-medium">金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.incomeByCategory.map((item) => (
                    <tr key={item.categoryId}>
                      <td className="py-2.5 text-slate-800 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono-num text-slate-500">
                        {item.count}
                      </td>
                      <td className="py-2.5 text-right font-mono-num text-slate-500">
                        {formatPercent(item.sharePercent)}
                      </td>
                      <td className="py-2.5 text-right font-mono-num font-semibold text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-800">二、硬性固定支出分类汇总</h3>
              <span className="font-mono-num text-xs font-semibold text-slate-900">
                小计 {formatCurrency(report.totalExpense)}
              </span>
            </div>
            {report.expenseByCategory.length === 0 ? (
              <div className="py-6 text-xs text-slate-400 text-center">本期暂无硬性支出记录</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 text-left font-medium">分类标签</th>
                    <th className="py-2 text-right font-medium">笔数</th>
                    <th className="py-2 text-right font-medium">占支出比</th>
                    <th className="py-2 text-right font-medium">金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.expenseByCategory.map((item) => (
                    <tr key={item.categoryId}>
                      <td className="py-2.5 text-slate-800 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono-num text-slate-500">
                        {item.count}
                      </td>
                      <td className="py-2.5 text-right font-mono-num text-slate-500">
                        {formatPercent(item.sharePercent)}
                      </td>
                      <td className="py-2.5 text-right font-mono-num font-semibold text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* Filterable Itemized Ledger */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              收支明细账目（共 {filteredEntries.length} 笔）
            </h3>
            <div className="text-xs text-slate-500 font-mono-num">
              筛选收入 <strong className="text-teal-700">{formatCurrency(filteredIncomeTotal)}</strong>
              <span className="mx-2 text-slate-300">|</span>
              筛选支出 <strong className="text-slate-900">{formatCurrency(filteredExpenseTotal)}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索项目名称、分类标签、成员或备注..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              {(
                [
                  { id: 'all', label: '全部' },
                  { id: 'income', label: '家庭收入' },
                  { id: 'fixed_expense', label: '硬性支出' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    typeFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              aria-label="筛选家庭成员"
              className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            >
              <option value="all">全部成员</option>
              {DEFAULT_MEMBERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
              aria-label="筛选结算状态"
              className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            >
              <option value="all">全部状态</option>
              <option value="paid">已确认（已入账/已扣款）</option>
              <option value="pending">待处理（待入账/待扣款）</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-xs text-slate-500 mr-1">分类标签筛选：</span>
            <button
              type="button"
              onClick={() => setSelectedTagIds([])}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                selectedTagIds.length === 0
                  ? 'bg-slate-900 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              全部标签
            </button>
            {visibleTagsForFilter.map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTagFilter(tag.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
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
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            没有符合当前筛选条件的收支明细记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-5">日期</th>
                  <th className="py-2.5 px-4">类型</th>
                  <th className="py-2.5 px-4">项目名称</th>
                  <th className="py-2.5 px-4">分类标签</th>
                  <th className="py-2.5 px-4">成员</th>
                  <th className="py-2.5 px-4">状态</th>
                  <th className="py-2.5 px-4 text-right">金额</th>
                  <th className="py-2.5 px-5 text-right no-print">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEntries.map((entry) => {
                  const tag = tagMap.get(entry.categoryId);
                  const isInc = entry.type === 'income';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-5 font-mono-num text-slate-500 whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={isInc ? 'text-teal-700 font-medium' : 'text-slate-700'}>
                          {isInc ? '家庭收入' : '硬性支出'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">{entry.title}</div>
                        {entry.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{entry.notes}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{ backgroundColor: tag?.color || '#64748B' }}
                          />
                          <span>{tag?.name || '未分类'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{entry.member}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(entry.id)}
                          className={`inline-flex items-center gap-1 font-medium ${
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
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                          isInc ? 'text-teal-700' : 'text-slate-900'
                        }`}
                      >
                        {isInc ? '+' : '-'}
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="py-2.5 px-5 text-right whitespace-nowrap no-print">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditEntry(entry)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                            aria-label="编辑记录"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEntry(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
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
        )}
      </section>
    </div>
  );
};
