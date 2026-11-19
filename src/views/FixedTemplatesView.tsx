import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Check,
  CopyCheck,
  FileSpreadsheet,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DEFAULT_MEMBERS } from '../data/seedData';
import { CategoryTag, FixedExpenseTemplate, LedgerEntry } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';

interface FixedTemplatesViewProps {
  templates: FixedExpenseTemplate[];
  entries: LedgerEntry[];
  tags: CategoryTag[];
  selectedMonth: string;
  selectedYear: string;
  skippedTemplateMonths: string[];
  lastBatchUndo: { label: string; createdIds: string[] } | null;
  onOpenAddTemplate: () => void;
  onEditTemplate: (tpl: FixedExpenseTemplate) => void;
  onToggleTemplateActive: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onGenerateForMonth: (monthKey: string) => number;
  onGenerateForYear: (yearKey: string) => number;
  onGenerateSingleForMonth: (
    templateId: string,
    monthKey: string,
    overrideAmount?: number
  ) => boolean;
  onRemoveFromMonth: (templateId: string, monthKey: string) => number;
  onQuickUpdateEntryAmount: (id: string, newAmount: number) => void;
  onUndoBatchGenerate: () => number;
  onExportExcel: () => void;
  onOpenExcelImport: () => void;
}

export const FixedTemplatesView: React.FC<FixedTemplatesViewProps> = ({
  templates,
  entries,
  tags,
  selectedMonth,
  selectedYear,
  skippedTemplateMonths,
  lastBatchUndo,
  onOpenAddTemplate,
  onEditTemplate,
  onToggleTemplateActive,
  onDeleteTemplate,
  onGenerateForMonth,
  onGenerateForYear,
  onGenerateSingleForMonth,
  onRemoveFromMonth,
  onQuickUpdateEntryAmount,
  onUndoBatchGenerate,
  onExportExcel,
  onOpenExcelImport,
}) => {
  const [targetMonth, setTargetMonth] = useState(selectedMonth);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'monthly' | 'occasional'>('all');

  const [pendingAddTplId, setPendingAddTplId] = useState<string | null>(null);
  const [pendingAddAmount, setPendingAddAmount] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryAmount, setEditingEntryAmount] = useState('');

  useEffect(() => {
    setTargetMonth(selectedMonth);
  }, [selectedMonth]);

  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const activeTemplates = templates.filter((t) => t.active);
  const monthlyActiveTemplates = activeTemplates.filter(
    (t) => (t.frequency ?? 'monthly') === 'monthly'
  );
  const occasionalActiveCount = activeTemplates.length - monthlyActiveTemplates.length;
  const variableActiveCount = activeTemplates.filter((t) => t.amountMode === 'variable').length;
  const monthlyBaseline = monthlyActiveTemplates.reduce((acc, t) => acc + t.amount, 0);
  const annualBaseline = monthlyBaseline * 12;

  const targetMonthLabel = useMemo(() => {
    const m = Number(targetMonth.slice(5, 7));
    return Number.isFinite(m) && m > 0 ? `${m}月` : targetMonth;
  }, [targetMonth]);

  const targetMonthEntriesByTpl = useMemo(() => {
    const map = new Map<string, LedgerEntry[]>();
    for (const e of entries) {
      if (!e.templateId || !e.date.startsWith(targetMonth)) continue;
      const list = map.get(e.templateId) || [];
      list.push(e);
      map.set(e.templateId, list);
    }
    return map;
  }, [entries, targetMonth]);

  const skippedSetForTarget = useMemo(() => {
    const prefix = `${targetMonth}::`;
    const set = new Set<string>();
    for (const pair of skippedTemplateMonths) {
      if (pair.startsWith(prefix)) {
        set.add(pair.slice(prefix.length));
      }
    }
    return set;
  }, [skippedTemplateMonths, targetMonth]);

  const sortedTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...templates]
      .filter((t) => {
        if (memberFilter !== 'all' && t.member !== memberFilter) return false;
        if (statusFilter === 'active' && !t.active) return false;
        if (statusFilter === 'paused' && t.active) return false;
        const freq = t.frequency ?? 'monthly';
        if (frequencyFilter !== 'all' && freq !== frequencyFilter) return false;
        if (q) {
          const tagName = tagMap.get(t.categoryId)?.name || '';
          const hay = [t.title, tagName, t.member, t.notes || ''].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.dueDay - b.dueDay);
  }, [templates, searchQuery, memberFilter, statusFilter, frequencyFilter, tagMap]);

  const hasFilter =
    searchQuery.trim() !== '' ||
    memberFilter !== 'all' ||
    statusFilter !== 'all' ||
    frequencyFilter !== 'all';

  const handleGenerateMonth = () => {
    const added = onGenerateForMonth(targetMonth);
    setFeedback(
      added > 0
        ? `已为 ${targetMonth} 登记 ${added} 项「每月固定」开支（已跳过手动删除项与非每月项）。`
        : `${targetMonth} 的每月固定模板均已登记或已跳过，无需重复生成。`
    );
  };

  const handleGenerateYear = () => {
    const added = onGenerateForYear(selectedYear);
    setFeedback(
      added > 0
        ? `已为 ${selectedYear} 年度补齐 ${added} 笔「每月固定」开支记录。`
        : `${selectedYear} 年度 1–12 月均已包含全部启用的每月固定开支。`
    );
  };

  const handleUndoBatch = () => {
    const removed = onUndoBatchGenerate();
    setFeedback(
      removed > 0 ? `已撤销本次批量生成，清理 ${removed} 笔开支记录。` : '无可撤销的生成记录。'
    );
  };

  const handleClickAddSingle = (tpl: FixedExpenseTemplate) => {
    if (tpl.amountMode === 'variable') {
      setPendingAddTplId(tpl.id);
      setPendingAddAmount(tpl.amount > 0 ? String(tpl.amount) : '');
      return;
    }
    const ok = onGenerateSingleForMonth(tpl.id, targetMonth);
    if (ok) {
      setFeedback(`已将「${tpl.title}」记入 ${targetMonth} 账目。`);
    }
  };

  const handleConfirmPendingAdd = (tpl: FixedExpenseTemplate) => {
    const trimmed = pendingAddAmount.trim();
    const num = trimmed === '' ? 0 : Number(trimmed);
    if (!Number.isFinite(num) || num < 0) return;
    const ok = onGenerateSingleForMonth(tpl.id, targetMonth, num);
    setPendingAddTplId(null);
    setPendingAddAmount('');
    if (ok) {
      setFeedback(
        `已将「${tpl.title}」（${formatCurrency(num)}）记入 ${targetMonth} 账目。`
      );
    }
  };

  const handleRemoveMonth = (tpl: FixedExpenseTemplate) => {
    const count = onRemoveFromMonth(tpl.id, targetMonth);
    if (count > 0) {
      setFeedback(`已从 ${targetMonth} 移除「${tpl.title}」（后续批量生成将自动跳过本月）。`);
    }
  };

  const startInlineAmountEdit = (entry: LedgerEntry) => {
    setEditingEntryId(entry.id);
    setEditingEntryAmount(String(entry.amount));
  };

  const commitInlineAmountEdit = (entryId: string) => {
    const num = Number(editingEntryAmount);
    if (Number.isFinite(num) && num >= 0) {
      onQuickUpdateEntryAmount(entryId, Math.round(num * 100) / 100);
    }
    setEditingEntryId(null);
    setEditingEntryAmount('');
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header & Baseline Metrics */}
      <section className="bg-white border border-slate-200 rounded-xl p-3 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-4 pb-3 sm:pb-5 border-b border-slate-100">
          <div>
            <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900">
              固定与周期性开支模板
            </h2>
            <p className="hidden sm:block text-xs text-slate-500 mt-1 max-w-2xl">
              支持「每月固定 / 非每月都有」与「固定金额 / 金额不固定（如水电燃气、取暖、季付物业）」；已生成的单月开支支持随时移除，移除后不会再被自动补齐。
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExportExcel}
              className="min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>导出 Excel</span>
            </button>
            <button
              type="button"
              onClick={onOpenExcelImport}
              className="min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>导入 Excel</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddTemplate}
              className="col-span-2 sm:col-span-1 min-h-[36px] inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新增开支模板</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-6 pt-3 sm:pt-5">
          <div>
            <div className="text-[10px] sm:text-xs text-slate-500">每月固定基线</div>
            <div className="mt-0.5 sm:mt-1 font-mono-num text-sm sm:text-xl font-bold text-slate-900 truncate">
              {formatCurrency(monthlyBaseline)}
            </div>
            {variableActiveCount > 0 && (
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                含 {variableActiveCount} 项浮动参考
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-slate-500">折合年度基线</div>
            <div className="mt-0.5 sm:mt-1 font-mono-num text-sm sm:text-xl font-bold text-slate-900 truncate">
              {formatCurrency(annualBaseline)}
            </div>
            {occasionalActiveCount > 0 && (
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                不含 {occasionalActiveCount} 项非每月
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-slate-500">启用 / 总数</div>
            <div className="mt-0.5 sm:mt-1 font-mono-num text-sm sm:text-xl font-bold text-slate-900 truncate">
              {activeTemplates.length} / {templates.length} 项
            </div>
            {occasionalActiveCount > 0 && (
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                按需记入 {occasionalActiveCount} 项
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Batch Generate Toolbar */}
      <section className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="batch-month" className="text-xs font-medium text-slate-700 shrink-0">
                管理月份：
              </label>
              <input
                id="batch-month"
                type="month"
                value={targetMonth}
                onChange={(e) => {
                  if (e.target.value) setTargetMonth(e.target.value);
                }}
                className="flex-1 sm:flex-initial h-9 px-3 text-sm sm:text-xs font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateMonth}
                className="min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <CalendarCheck2 className="w-3.5 h-3.5 shrink-0" />
                <span>生成该月开支</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateYear}
                className="min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <CopyCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>补齐 {selectedYear} 全年</span>
              </button>
            </div>
          </div>

          {lastBatchUndo && lastBatchUndo.createdIds.length > 0 && (
            <button
              type="button"
              onClick={handleUndoBatch}
              className="min-h-[34px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>
                撤销「{lastBatchUndo.label}」（{lastBatchUndo.createdIds.length} 笔）
              </span>
            </button>
          )}
        </div>

        {feedback && (
          <div className="text-xs font-medium text-teal-800 bg-teal-50 px-3 py-2 rounded-lg flex items-center justify-between gap-2">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-teal-700 hover:text-teal-900 p-0.5 shrink-0"
              aria-label="关闭提示"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* Templates List (Search + Mobile Cards + Desktop Table) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {templates.length > 0 && (
          <div className="p-2.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2 no-print">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索开支名称、分类标签、成员或备注..."
                className="w-full h-9 pl-9 pr-8 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label="清空搜索"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2">
              <select
                value={frequencyFilter}
                onChange={(e) =>
                  setFrequencyFilter(e.target.value as 'all' | 'monthly' | 'occasional')
                }
                aria-label="按发生频次筛选"
                className="h-9 px-2 sm:px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                <option value="all">全部频次</option>
                <option value="monthly">每月固定</option>
                <option value="occasional">非每月都有</option>
              </select>

              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                aria-label="按责任成员筛选"
                className="h-9 px-2 sm:px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
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
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'paused')}
                aria-label="按启用状态筛选"
                className="h-9 px-2 sm:px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                <option value="all">全部状态</option>
                <option value="active">仅启用中</option>
                <option value="paused">仅已暂停</option>
              </select>
            </div>
          </div>
        )}

        {sortedTemplates.length === 0 ? (
          templates.length > 0 && hasFilter ? (
            <div className="p-8 sm:p-10 text-center space-y-2">
              <p className="text-xs text-slate-500">没有符合当前搜索或筛选条件的开支模板</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setMemberFilter('all');
                  setStatusFilter('all');
                  setFrequencyFilter('all');
                }}
                className="text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                清空筛选条件
              </button>
            </div>
          ) : (
            <div className="p-10 sm:p-12 text-center">
              <p className="text-sm font-medium text-slate-700">尚未建立固定开支模板</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                支持房贷物业等每月固定支出，也支持水电燃气、季付保费等金额浮动或非每月发生的项目
              </p>
              <button
                type="button"
                onClick={onOpenAddTemplate}
                className="min-h-[42px] sm:min-h-[36px] px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
              >
                添加第一项开支模板
              </button>
            </div>
          )
        ) : (
          <>
            {/* Mobile Compact Rows */}
            <div className="md:hidden divide-y divide-slate-100">
              {sortedTemplates.map((tpl) => {
                const tag = tagMap.get(tpl.categoryId);
                const isOccasional = tpl.frequency === 'occasional';
                const isVariable = tpl.amountMode === 'variable';
                const monthEntries = targetMonthEntriesByTpl.get(tpl.id) || [];
                const isSynced = monthEntries.length > 0;
                const isSkipped = !isSynced && skippedSetForTarget.has(tpl.id);
                const primaryEntry = monthEntries[0];
                const monthTotal = monthEntries.reduce((acc, e) => acc + e.amount, 0);
                const isAddingHere = pendingAddTplId === tpl.id;
                const isEditingHere = primaryEntry && editingEntryId === primaryEntry.id;

                return (
                  <div
                    key={tpl.id}
                    className={`px-3 py-2.5 space-y-1.5 ${!tpl.active ? 'opacity-65' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-xs shrink-0"
                          style={{ backgroundColor: tag?.color || '#64748B' }}
                        />
                        <span className="font-mono-num text-[11px] text-slate-500 shrink-0">
                          {tpl.dueDay}日
                        </span>
                        <span className="text-[13px] font-semibold text-slate-900 truncate">
                          {tpl.title}
                        </span>
                      </div>
                      <span className="font-mono-num text-[13px] font-bold text-slate-900 whitespace-nowrap shrink-0">
                        {isVariable && tpl.amount === 0 ? '金额浮动' : formatCurrency(tpl.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 truncate min-w-0">
                        <span>{tag?.name || '未分类'}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span>{tpl.member}</span>
                        {isOccasional && (
                          <>
                            <span className="mx-1 text-slate-300">·</span>
                            <span className="text-amber-700 font-medium">非每月</span>
                          </>
                        )}
                        {isVariable && (
                          <>
                            <span className="mx-1 text-slate-300">·</span>
                            <span className="text-teal-700 font-medium">浮动</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleTemplateActive(tpl.id)}
                          className={`px-1.5 py-0.5 inline-flex items-center gap-1 rounded text-[11px] font-medium transition-colors ${
                            tpl.active
                              ? 'text-teal-800 bg-teal-50'
                              : 'text-slate-500 bg-slate-100'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{tpl.active ? '启用' : '暂停'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTemplate(tpl)}
                          className="w-7 h-7 inline-flex items-center justify-center text-slate-500 active:bg-slate-100 rounded-md"
                          aria-label="编辑模板"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTemplate(tpl.id)}
                          className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-red-600 active:bg-red-50 rounded-md"
                          aria-label="删除模板"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Target Month Status & 1-Tap Actions */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100/80">
                      {isSynced && primaryEntry ? (
                        <>
                          {isEditingHere ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <span className="text-[11px] text-slate-500 shrink-0">
                                {targetMonthLabel}实付:
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={editingEntryAmount}
                                onChange={(e) => setEditingEntryAmount(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitInlineAmountEdit(primaryEntry.id);
                                  if (e.key === 'Escape') setEditingEntryId(null);
                                }}
                                autoFocus
                                className="w-24 h-7 px-2 text-xs font-mono-num bg-white border border-teal-600 rounded-md focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => commitInlineAmountEdit(primaryEntry.id)}
                                className="h-7 px-2 text-[11px] font-medium text-white bg-teal-700 rounded-md"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingEntryId(null)}
                                className="h-7 px-1.5 text-[11px] text-slate-500"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startInlineAmountEdit(primaryEntry)}
                              className="text-[11px] font-medium text-teal-700 inline-flex items-center gap-1 hover:underline"
                            >
                              <span>
                                {targetMonthLabel}已记 {formatCurrency(monthTotal)}
                              </span>
                              <Pencil className="w-2.5 h-2.5 opacity-70" />
                            </button>
                          )}

                          {!isEditingHere && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMonth(tpl)}
                              className="px-2 py-0.5 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md whitespace-nowrap"
                            >
                              移除{targetMonthLabel}
                            </button>
                          )}
                        </>
                      ) : isAddingHere ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="text-[11px] text-slate-600 shrink-0">
                            {targetMonthLabel}实付:
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={pendingAddAmount}
                            onChange={(e) => setPendingAddAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmPendingAdd(tpl);
                              if (e.key === 'Escape') setPendingAddTplId(null);
                            }}
                            placeholder="输入本月金额"
                            autoFocus
                            className="flex-1 min-w-0 h-7 px-2 text-xs font-mono-num bg-white border border-teal-600 rounded-md focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmPendingAdd(tpl)}
                            className="h-7 px-2.5 text-[11px] font-medium text-white bg-teal-700 rounded-md shrink-0"
                          >
                            记入
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingAddTplId(null)}
                            className="h-7 px-1.5 text-[11px] text-slate-500 shrink-0"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`text-[11px] ${
                              isSkipped ? 'text-amber-700' : 'text-slate-400'
                            }`}
                          >
                            {isSkipped
                              ? `${targetMonthLabel}已跳过`
                              : isOccasional
                                ? `${targetMonthLabel}按需记入`
                                : `${targetMonthLabel}未生成`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleClickAddSingle(tpl)}
                            className="px-2 py-0.5 text-[11px] font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md whitespace-nowrap"
                          >
                            + 记入{targetMonthLabel}
                          </button>
                        </>
                      )}
                    </div>

                    {tpl.notes && (
                      <div className="text-[11px] text-slate-400 truncate">{tpl.notes}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-medium text-slate-500">
                    <th className="py-3 px-5">扣款日 / 频次</th>
                    <th className="py-3 px-4">固定开支名称</th>
                    <th className="py-3 px-4">分类标签</th>
                    <th className="py-3 px-4">责任成员</th>
                    <th className="py-3 px-4">{targetMonth} 当月管理</th>
                    <th className="py-3 px-4 text-right">模板标准金额</th>
                    <th className="py-3 px-4 text-center">模板状态</th>
                    <th className="py-3 px-5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sortedTemplates.map((tpl) => {
                    const tag = tagMap.get(tpl.categoryId);
                    const isOccasional = tpl.frequency === 'occasional';
                    const isVariable = tpl.amountMode === 'variable';
                    const monthEntries = targetMonthEntriesByTpl.get(tpl.id) || [];
                    const isSynced = monthEntries.length > 0;
                    const isSkipped = !isSynced && skippedSetForTarget.has(tpl.id);
                    const primaryEntry = monthEntries[0];
                    const monthTotal = monthEntries.reduce((acc, e) => acc + e.amount, 0);
                    const isAddingHere = pendingAddTplId === tpl.id;
                    const isEditingHere = primaryEntry && editingEntryId === primaryEntry.id;

                    return (
                      <tr
                        key={tpl.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          !tpl.active ? 'opacity-65' : ''
                        }`}
                      >
                        <td className="py-3 px-5 whitespace-nowrap">
                          <div className="font-mono-num text-slate-700">
                            {isOccasional ? `通常 ${tpl.dueDay} 日` : `每月 ${tpl.dueDay} 日`}
                          </div>
                          <div className="text-[11px] mt-0.5">
                            {isOccasional ? (
                              <span className="text-amber-700 font-medium">非每月都有</span>
                            ) : (
                              <span className="text-slate-400">每月固定</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{tpl.title}</div>
                          {tpl.notes && (
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                              {tpl.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-xs shrink-0"
                              style={{ backgroundColor: tag?.color || '#64748B' }}
                            />
                            <span>{tag?.name || '未分类'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{tpl.member}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isSynced && primaryEntry ? (
                            isEditingHere ? (
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingEntryAmount}
                                  onChange={(e) => setEditingEntryAmount(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitInlineAmountEdit(primaryEntry.id);
                                    if (e.key === 'Escape') setEditingEntryId(null);
                                  }}
                                  autoFocus
                                  className="w-24 h-7 px-2 text-xs font-mono-num bg-white border border-teal-600 rounded-md focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => commitInlineAmountEdit(primaryEntry.id)}
                                  className="h-7 px-2 text-white bg-teal-700 rounded-md"
                                  aria-label="保存本月实付金额"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEntryId(null)}
                                  className="h-7 px-1.5 text-slate-400 hover:text-slate-700"
                                  aria-label="取消"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startInlineAmountEdit(primaryEntry)}
                                  className="text-teal-700 font-medium hover:underline inline-flex items-center gap-1"
                                  title="点击修改本月实付金额"
                                >
                                  <span>已记 {formatCurrency(monthTotal)}</span>
                                  <Pencil className="w-3 h-3 opacity-60" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMonth(tpl)}
                                  className="px-2 py-0.5 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                >
                                  移除本月
                                </button>
                              </div>
                            )
                          ) : isAddingHere ? (
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={pendingAddAmount}
                                onChange={(e) => setPendingAddAmount(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleConfirmPendingAdd(tpl);
                                  if (e.key === 'Escape') setPendingAddTplId(null);
                                }}
                                placeholder="实付金额"
                                autoFocus
                                className="w-24 h-7 px-2 text-xs font-mono-num bg-white border border-teal-600 rounded-md focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleConfirmPendingAdd(tpl)}
                                className="h-7 px-2.5 text-[11px] font-medium text-white bg-teal-700 rounded-md"
                              >
                                记入
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingAddTplId(null)}
                                className="h-7 px-1 text-slate-400 hover:text-slate-700"
                                aria-label="取消"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <span
                                className={
                                  isSkipped ? 'text-amber-700' : 'text-slate-400'
                                }
                              >
                                {isSkipped
                                  ? '本月已跳过'
                                  : isOccasional
                                    ? '按需记入'
                                    : '未生成'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleClickAddSingle(tpl)}
                                className="px-2 py-0.5 text-[11px] font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors"
                              >
                                + 记入{targetMonthLabel}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-mono-num font-semibold text-slate-900">
                            {isVariable && tpl.amount === 0
                              ? '待定（浮动）'
                              : formatCurrency(tpl.amount)}
                          </div>
                          {isVariable && (
                            <div className="text-[11px] text-teal-700">金额不固定</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onToggleTemplateActive(tpl.id)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                              tpl.active
                                ? 'text-teal-800 bg-teal-50 hover:bg-teal-100'
                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            <span>{tpl.active ? '启用中' : '已暂停'}</span>
                          </button>
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditTemplate(tpl)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                              aria-label="编辑模板"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTemplate(tpl.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                              aria-label="删除模板"
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
          </>
        )}
      </section>
    </div>
  );
};
