import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Home,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AssetAllocationChart, AssetTrendChart } from '../components/Charts';
import { ASSET_CATEGORY_META, DEFAULT_MEMBERS } from '../data/seedData';
import {
  AccountDirection,
  AssetAccountItem,
  AssetCategory,
  AssetMonthTrendPoint,
  AssetSnapshotSummary,
} from '../types/ledger';
import { exportAssetSnapshotToExcel } from '../utils/excel';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface CopyUndoState {
  monthKey: string;
  sourceMonth: string;
  createdIds: string[];
}

interface AssetsLiabilitiesViewProps {
  selectedMonth: string;
  selectedYear: string;
  onChangeMonth: (month: string) => void;
  monthItems: AssetAccountItem[];
  allAssetItems: AssetAccountItem[];
  summary: AssetSnapshotSummary;
  monthlyMortgagePayment?: number;
  annualTrend: AssetMonthTrendPoint[];
  copySourceMonth: string | null;
  lastCopyUndo: CopyUndoState | null;
  onCopyFromAdjacentMonth: (monthKey: string, sourceMonthKey?: string) => number;
  onUndoCopyAssets: () => number;
  onConfirmAccount: (id: string) => void;
  onConfirmAllForMonth: () => number;
  onOpenAddAccount: (direction: AccountDirection) => void;
  onEditAccount: (item: AssetAccountItem) => void;
  onQuickUpdateAmount: (id: string, newAmount: number) => void;
  onDeleteAccount: (id: string) => void;
  onOpenExcelImport: () => void;
}

export const AssetsLiabilitiesView: React.FC<AssetsLiabilitiesViewProps> = ({
  selectedMonth,
  selectedYear,
  onChangeMonth,
  monthItems,
  summary,
  monthlyMortgagePayment = 0,
  annualTrend,
  copySourceMonth,
  lastCopyUndo,
  onCopyFromAdjacentMonth,
  onUndoCopyAssets,
  onConfirmAccount,
  onConfirmAllForMonth,
  onOpenAddAccount,
  onEditAccount,
  onQuickUpdateAmount,
  onDeleteAccount,
  onOpenExcelImport,
}) => {
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineVal, setInlineVal] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const metaColorMap = useMemo(
    () => new Map(ASSET_CATEGORY_META.map((m) => [m.category, m.color])),
    []
  );

  const hasActiveFilter =
    searchQuery.trim() !== '' || memberFilter !== 'all' || categoryFilter !== 'all';

  const matchesFilter = (item: AssetAccountItem): boolean => {
    if (memberFilter !== 'all' && item.member !== memberFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const hay = [
        item.name,
        item.institution,
        item.category,
        item.member,
        item.notes || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  interface CategorySubgroup {
    category: AssetCategory;
    color: string;
    subtotal: number;
    creditLimitTotal: number;
    items: AssetAccountItem[];
  }

  interface MemberGroup {
    member: string;
    subtotal: number;
    totalCount: number;
    categories: CategorySubgroup[];
  }

  const buildMemberGroups = (
    items: AssetAccountItem[],
    direction: AccountDirection
  ): MemberGroup[] => {
    const memberSet = new Set(items.map((i) => i.member || DEFAULT_MEMBERS[0]));
    const memberOrder: string[] = [
      ...DEFAULT_MEMBERS.filter((m) => memberSet.has(m)),
      ...[...memberSet].filter((m) => !DEFAULT_MEMBERS.includes(m)),
    ];

    const baseCategoryOrder = ASSET_CATEGORY_META.filter((m) => m.direction === direction).map(
      (m) => m.category
    );

    const groups: MemberGroup[] = [];
    for (const member of memberOrder) {
      const mItems = items.filter((i) => (i.member || DEFAULT_MEMBERS[0]) === member);
      if (mItems.length === 0) continue;

      const extraCats = mItems
        .map((i) => i.category)
        .filter((c, idx, arr) => !baseCategoryOrder.includes(c) && arr.indexOf(c) === idx);
      const catOrder = [...baseCategoryOrder, ...extraCats];

      const categories: CategorySubgroup[] = [];
      for (const category of catOrder) {
        const cItems = mItems
          .filter((i) => i.category === category)
          .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'zh-CN'));
        if (cItems.length === 0) continue;
        categories.push({
          category,
          color:
            metaColorMap.get(category) ||
            (direction === 'asset'
              ? '#0F766E'
              : direction === 'mortgage'
                ? '#B45309'
                : '#DC2626'),
          subtotal: cItems.reduce((acc, i) => acc + i.amount, 0),
          creditLimitTotal: cItems.reduce((acc, i) => acc + (i.creditLimit || 0), 0),
          items: cItems,
        });
      }

      groups.push({
        member,
        subtotal: mItems.reduce((acc, i) => acc + i.amount, 0),
        totalCount: mItems.length,
        categories,
      });
    }
    return groups;
  };

  const assetList = useMemo(
    () =>
      monthItems
        .filter((a) => a.direction === 'asset' && matchesFilter(a))
        .sort((a, b) => b.amount - a.amount),
    [monthItems, searchQuery, memberFilter, categoryFilter]
  );

  const liabilityList = useMemo(
    () =>
      monthItems
        .filter((a) => a.direction === 'liability' && matchesFilter(a))
        .sort((a, b) => b.amount - a.amount),
    [monthItems, searchQuery, memberFilter, categoryFilter]
  );

  const mortgageList = useMemo(
    () =>
      monthItems
        .filter((a) => a.direction === 'mortgage' && matchesFilter(a))
        .sort((a, b) => b.amount - a.amount),
    [monthItems, searchQuery, memberFilter, categoryFilter]
  );

  const assetMemberGroups = useMemo(
    () => buildMemberGroups(assetList, 'asset'),
    [assetList, metaColorMap]
  );

  const liabilityMemberGroups = useMemo(
    () => buildMemberGroups(liabilityList, 'liability'),
    [liabilityList, metaColorMap]
  );

  const mortgageMemberGroups = useMemo(
    () => buildMemberGroups(mortgageList, 'mortgage'),
    [mortgageList, metaColorMap]
  );

  const filteredAssetTotal = useMemo(
    () => assetList.reduce((acc, i) => acc + i.amount, 0),
    [assetList]
  );

  const filteredLiabilityTotal = useMemo(
    () => liabilityList.reduce((acc, i) => acc + i.amount, 0),
    [liabilityList]
  );

  const filteredMortgageTotal = useMemo(
    () => mortgageList.reduce((acc, i) => acc + i.amount, 0),
    [mortgageList]
  );

  const totalMonthAssetsCount = monthItems.filter((a) => a.direction === 'asset').length;
  const totalMonthLiabilitiesCount = monthItems.filter((a) => a.direction === 'liability').length;
  const totalMonthMortgagesCount = monthItems.filter((a) => a.direction === 'mortgage').length;

  const startInlineEdit = (item: AssetAccountItem) => {
    setInlineEditId(item.id);
    setInlineVal(String(item.amount));
  };

  const toggleInlineSign = () => {
    const trimmed = inlineVal.trim();
    if (!trimmed) {
      setInlineVal('-');
    } else if (trimmed === '-') {
      setInlineVal('');
    } else if (trimmed.startsWith('-')) {
      setInlineVal(trimmed.slice(1));
    } else {
      setInlineVal(`-${trimmed}`);
    }
  };

  const commitInlineEdit = (id: string) => {
    const num = Number(inlineVal);
    const target = monthItems.find((a) => a.id === id);
    const allowNegative = target?.category === '信用卡支出额度';
    if (Number.isFinite(num) && (allowNegative || num >= 0)) {
      onQuickUpdateAmount(id, Math.round(num * 100) / 100);
    }
    setInlineEditId(null);
  };

  const handleCopyAdjacent = () => {
    if (!copySourceMonth) return;
    const added = onCopyFromAdjacentMonth(selectedMonth, copySourceMonth);
    setFeedback(
      added > 0
        ? `已沿用 ${copySourceMonth} 的账户结构与信用卡额度，生成 ${added} 个账户条目；如仅为试用可随时点击右侧「撤销沿用」。`
        : `${selectedMonth} 已包含可继承的账户条目。`
    );
  };

  const remainingUndoCount = useMemo(() => {
    if (!lastCopyUndo || lastCopyUndo.monthKey !== selectedMonth) return 0;
    const monthIdSet = new Set(monthItems.map((m) => m.id));
    return lastCopyUndo.createdIds.filter((id) => monthIdSet.has(id)).length;
  }, [lastCopyUndo, selectedMonth, monthItems]);

  const handleUndoCopy = () => {
    const removed = onUndoCopyAssets();
    setFeedback(
      removed > 0
        ? `已撤销本次沿用，移除了刚刚生成的 ${removed} 个账户条目。`
        : '没有可撤销的沿用记录。'
    );
  };

  const pendingConfirmCount = useMemo(
    () => monthItems.filter((a) => a.needsConfirm).length,
    [monthItems]
  );

  const handleConfirmAll = () => {
    const confirmed = onConfirmAllForMonth();
    if (confirmed > 0) {
      setFeedback(`已确认 ${selectedMonth} 的 ${confirmed} 项继承账户，颜色已恢复正常。`);
    }
  };

  const copyActionLabel = copySourceMonth
    ? copySourceMonth > selectedMonth
      ? `继承 ${copySourceMonth} 账户与额度`
      : `沿用 ${copySourceMonth} 账户与额度`
    : '继承相邻月份账户结构';

  const netDelta =
    summary.previousNetAssets !== undefined
      ? summary.netMonetaryAssets - summary.previousNetAssets
      : undefined;

  const mortgageDelta =
    summary.previousMortgageTotal !== undefined
      ? summary.mortgageTotal - summary.previousMortgageTotal
      : undefined;

  const commercialShare =
    summary.mortgageTotal > 0 ? (summary.mortgageCommercial / summary.mortgageTotal) * 100 : 0;
  const providentShare =
    summary.mortgageTotal > 0 ? (summary.mortgageProvident / summary.mortgageTotal) * 100 : 0;

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header & Action Toolbar */}
      <section className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900">
            {selectedMonth} 月底家庭资产借贷统计
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            统计货币资产、借贷与信用卡额度，及商贷与公积金房贷剩余本金汇总
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 no-print">
          {copySourceMonth && monthItems.length === 0 && (
            <button
              type="button"
              onClick={handleCopyAdjacent}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copyActionLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenAddAccount('asset')}
            className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>登记货币资产</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAddAccount('liability')}
            className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>登记借贷 / 信用卡</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAddAccount('mortgage')}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>登记房贷本金</span>
          </button>
          <button
            type="button"
            onClick={() =>
              exportAssetSnapshotToExcel(
                `家庭月底资产借贷_${selectedMonth}.xlsx`,
                selectedMonth,
                monthItems
              )
            }
            className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>导出 Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={onOpenExcelImport}
            className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>导入 Excel</span>
          </button>
        </div>
      </section>

      {(feedback || remainingUndoCount > 0 || pendingConfirmCount > 0) && (
        <div
          className={`text-xs px-3 sm:px-4 py-2 rounded-xl flex flex-wrap items-center justify-between gap-2 no-print border ${
            pendingConfirmCount > 0
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-teal-50 border-teal-200 text-teal-900'
          }`}
        >
          <span className="flex-1 min-w-[200px]">
            {pendingConfirmCount > 0
              ? `当前「${selectedMonth}」有 ${pendingConfirmCount} 项继承账户为黄色待核对状态（修改金额或点击「确认」后恢复正常颜色）。`
              : feedback ||
                `当前「${selectedMonth}」包含从 ${lastCopyUndo?.sourceMonth} 沿用的 ${remainingUndoCount} 个账户条目，如需取消可一键撤销。`}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {pendingConfirmCount > 0 && (
              <button
                type="button"
                onClick={handleConfirmAll}
                className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>全部确认 ({pendingConfirmCount})</span>
              </button>
            )}
            {remainingUndoCount > 0 && (
              <button
                type="button"
                onClick={handleUndoCopy}
                className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>撤销本次沿用 ({remainingUndoCount})</span>
              </button>
            )}
            {feedback && (
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className={`min-w-[32px] min-h-[32px] inline-flex items-center justify-center ${
                  pendingConfirmCount > 0
                    ? 'text-amber-800 hover:text-amber-950'
                    : 'text-teal-700 hover:text-teal-900'
                }`}
                aria-label="关闭提示"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4-Column KPI Strip (2x2 on mobile) */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {selectedMonth} · 货币资产
          </div>
          <div className="mt-1 sm:mt-2 font-mono-num text-base sm:text-2xl font-bold text-teal-700 truncate">
            {formatCurrency(summary.totalAssets)}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 truncate">
            共 {summary.assetCount} 个资产账户
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {selectedMonth} · 借贷与信用
          </div>
          <div
            className={`mt-1 sm:mt-2 font-mono-num text-base sm:text-2xl font-bold truncate ${
              summary.totalLiabilities < 0 ? 'text-teal-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(summary.totalLiabilities)}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 font-mono-num truncate">
            卡 {formatCurrency(summary.creditCardSpent)} · 贷 {formatCurrency(summary.loanTotal)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            {selectedMonth} · 净货币资产
          </div>
          <div
            className={`mt-1 sm:mt-2 font-mono-num text-base sm:text-2xl font-bold truncate ${
              summary.netMonetaryAssets >= 0 ? 'text-slate-900' : 'text-red-600'
            }`}
          >
            {formatCurrency(summary.netMonetaryAssets)}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 font-mono-num truncate">
            {netDelta !== undefined
              ? `较上月 ${formatCurrency(netDelta, true)}`
              : '暂无上月对照'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
            信用卡已用 / 授信
          </div>
          <div className="mt-1 sm:mt-2 font-mono-num text-base sm:text-2xl font-bold text-slate-900">
            {formatPercent(summary.creditCardUtilization)}
          </div>
          <div className="mt-0.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 font-mono-num truncate">
            {formatCurrency(summary.creditCardSpent)} / {formatCurrency(summary.creditCardLimit)}
          </div>
        </div>
      </section>

      {/* Dedicated Long-Term Mortgage Principal Strip */}
      {(summary.mortgageCount > 0 || monthlyMortgagePayment > 0) && (
        <section className="bg-white border border-amber-200/80 rounded-xl p-3 sm:p-5 space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Home className="w-4 h-4 text-amber-700 shrink-0" />
              <h3 className="font-display text-xs sm:text-sm font-semibold text-slate-900 truncate">
                {selectedMonth} · 房贷剩余本金汇总（商贷 + 公积金）
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              独立统计长期本金，不计入上方「净货币资产」与短债比率
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 pt-1 border-t border-slate-100">
            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 sm:p-3.5">
              <div className="text-[11px] font-medium text-amber-900/80 truncate">
                贷款本金总额
              </div>
              <div className="mt-1 font-mono-num text-base sm:text-xl font-bold text-amber-800 truncate">
                {formatCurrency(summary.mortgageTotal)}
              </div>
              <div className="mt-0.5 text-[10px] sm:text-xs text-slate-500 font-mono-num truncate">
                {mortgageDelta !== undefined
                  ? `较上月 ${formatCurrency(mortgageDelta, true)}`
                  : `共 ${summary.mortgageCount} 笔房贷`}
              </div>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-2.5 sm:p-3.5">
              <div className="text-[11px] font-medium text-slate-500 truncate">
                商业贷款本金
              </div>
              <div className="mt-1 font-mono-num text-base sm:text-xl font-bold text-slate-900 truncate">
                {formatCurrency(summary.mortgageCommercial)}
              </div>
              <div className="mt-0.5 text-[10px] sm:text-xs text-slate-500 font-mono-num truncate">
                占总本金 {formatPercent(commercialShare)}
              </div>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-2.5 sm:p-3.5">
              <div className="text-[11px] font-medium text-slate-500 truncate">
                公积金贷款本金
              </div>
              <div className="mt-1 font-mono-num text-base sm:text-xl font-bold text-sky-800 truncate">
                {formatCurrency(summary.mortgageProvident)}
              </div>
              <div className="mt-0.5 text-[10px] sm:text-xs text-slate-500 font-mono-num truncate">
                占总本金 {formatPercent(providentShare)}
              </div>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-2.5 sm:p-3.5">
              <div className="text-[11px] font-medium text-slate-500 truncate">
                本月房贷月供（固定支出）
              </div>
              <div className="mt-1 font-mono-num text-base sm:text-xl font-bold text-slate-900 truncate">
                {formatCurrency(monthlyMortgagePayment)}
              </div>
              <div className="mt-0.5 text-[10px] sm:text-xs text-slate-500 truncate">
                已于收支账本固定支出体现
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Charts Row */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-6 items-stretch">
        <div className="xl:col-span-7">
          <AssetTrendChart
            yearKey={selectedYear}
            activeMonthKey={selectedMonth}
            data={annualTrend}
            onSelectMonth={(mKey) => onChangeMonth(mKey)}
          />
        </div>
        <div className="xl:col-span-5">
          <AssetAllocationChart
            monthKey={selectedMonth}
            assetsByCategory={summary.assetsByCategory}
            totalAssets={summary.totalAssets}
          />
        </div>
      </section>

      {/* Search & Filter Bar for Quick Lookup & Editing */}
      {monthItems.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-4 space-y-2 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索账户名称、银行/借款对象、分类、成员或备注..."
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

            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                aria-label="按归属成员筛选"
                className="h-9 px-2.5 sm:px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                <option value="all">全部成员</option>
                {DEFAULT_MEMBERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="按资产借贷类别筛选"
                className="h-9 px-2.5 sm:px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              >
                <option value="all">全部类别</option>
                <optgroup label="货币资产 / 借出应收">
                  {ASSET_CATEGORY_META.filter((m) => m.direction === 'asset').map((m) => (
                    <option key={m.category} value={m.category}>
                      {m.category}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="借贷与信用卡">
                  {ASSET_CATEGORY_META.filter((m) => m.direction === 'liability').map((m) => (
                    <option key={m.category} value={m.category}>
                      {m.category}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="房贷本金（商贷 / 公积金）">
                  {ASSET_CATEGORY_META.filter((m) => m.direction === 'mortgage').map((m) => (
                    <option key={m.category} value={m.category}>
                      {m.category}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {hasActiveFilter && (
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-0.5">
              <span>
                已筛出 <strong className="text-teal-700 font-mono-num">{assetList.length}</strong> /{' '}
                {totalMonthAssetsCount} 项资产，{' '}
                <strong className="text-slate-900 font-mono-num">{liabilityList.length}</strong> /{' '}
                {totalMonthLiabilitiesCount} 项借贷与信用
                {(totalMonthMortgagesCount > 0 || mortgageList.length > 0) && (
                  <>
                    ，{' '}
                    <strong className="text-amber-800 font-mono-num">{mortgageList.length}</strong>{' '}
                    / {totalMonthMortgagesCount} 项房贷本金
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setMemberFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
              >
                清空筛选
              </button>
            </div>
          )}
        </section>
      )}

      {/* Monetary Assets Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              一、货币资产与应收账户明细（储蓄卡 / 货基 / 积存金 / 股票 / 借出款）
            </h3>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              按成员与资产分类独立列出并按金额降序排列，点击金额即可快捷修改月底余额
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-mono-num text-xs sm:text-sm font-bold text-teal-700">
              {hasActiveFilter ? '筛选小计' : '小计'}{' '}
              {formatCurrency(hasActiveFilter ? filteredAssetTotal : summary.totalAssets)}
            </span>
            {copySourceMonth && monthItems.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAdjacent}
                className="inline-flex items-center gap-1 min-h-[30px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors no-print"
              >
                <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>补齐 {copySourceMonth} 缺失账户</span>
              </button>
            )}
          </div>
        </div>

        {assetList.length === 0 ? (
          totalMonthAssetsCount > 0 && hasActiveFilter ? (
            <div className="p-8 text-center text-xs text-slate-500">
              没有符合当前搜索或筛选条件的货币资产账户
            </div>
          ) : (
            <div className="p-8 sm:p-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                {selectedMonth} 尚无货币资产盘点记录
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                可点击「登记货币资产」，或继承前后已登记月份的账户结构与信用卡额度
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {copySourceMonth && (
                  <button
                    type="button"
                    onClick={handleCopyAdjacent}
                    className="h-10 px-4 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg"
                  >
                    {copyActionLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenAddAccount('asset')}
                  className="h-10 px-4 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  新增货币资产
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="divide-y divide-slate-200">
            {assetMemberGroups.map((memberGroup) => {
              const memberShare =
                summary.totalAssets > 0
                  ? (memberGroup.subtotal / summary.totalAssets) * 100
                  : 0;

              return (
                <div key={memberGroup.member}>
                  {/* Member Group Header */}
                  <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs sm:text-[13px] font-bold text-slate-900">
                        {memberGroup.member}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono-num">
                        {memberGroup.totalCount} 项 · 占资产 {formatPercent(memberShare)}
                      </span>
                    </div>
                    <span className="font-mono-num text-xs sm:text-[13px] font-bold text-teal-700 whitespace-nowrap">
                      小计 {formatCurrency(memberGroup.subtotal)}
                    </span>
                  </div>

                  {/* Mobile Grouped Rows */}
                  <div className="md:hidden divide-y divide-slate-200">
                    {memberGroup.categories.map((catGroup) => {
                      const catShare =
                        summary.totalAssets > 0
                          ? (catGroup.subtotal / summary.totalAssets) * 100
                          : 0;

                      return (
                        <div key={catGroup.category}>
                          <div className="px-3 py-1.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2 h-2 rounded-xs shrink-0"
                                style={{ backgroundColor: catGroup.color }}
                              />
                              <span className="text-[11px] font-semibold text-slate-700 truncate">
                                {catGroup.category}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono-num">
                                ({catGroup.items.length})
                              </span>
                            </div>
                            <span className="font-mono-num text-[11px] font-bold text-slate-800 whitespace-nowrap">
                              {formatCurrency(catGroup.subtotal)}
                              <span className="ml-1 font-normal text-slate-400">
                                ({formatPercent(catShare)})
                              </span>
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {catGroup.items.map((item) => {
                              const share =
                                summary.totalAssets > 0
                                  ? (item.amount / summary.totalAssets) * 100
                                  : 0;
                              const isEditingInline = inlineEditId === item.id;

                              const isPendingConfirm = Boolean(item.needsConfirm);

                              return (
                                <div
                                  key={item.id}
                                  className={`px-3 py-2 space-y-1 transition-colors ${
                                    isPendingConfirm
                                      ? 'bg-amber-50/90 border-l-2 border-l-amber-400'
                                      : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[13px] font-semibold text-slate-900 truncate">
                                        {item.name}
                                      </span>
                                      {isPendingConfirm && (
                                        <span className="text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-1 py-0.2 rounded shrink-0">
                                          待确认
                                        </span>
                                      )}
                                    </div>

                                    <div className="shrink-0">
                                      {isEditingInline ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            min="0"
                                            autoFocus
                                            value={inlineVal}
                                            onChange={(e) => setInlineVal(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') commitInlineEdit(item.id);
                                              if (e.key === 'Escape') setInlineEditId(null);
                                            }}
                                            className="w-24 h-8 px-2 text-right font-mono-num text-sm bg-white border border-teal-600 rounded-md focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => commitInlineEdit(item.id)}
                                            className="w-8 h-8 inline-flex items-center justify-center text-white bg-teal-700 hover:bg-teal-800 rounded-md"
                                            aria-label="保存金额"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => startInlineEdit(item)}
                                          className={`px-1.5 py-0.5 -mr-1.5 rounded active:bg-slate-100 font-mono-num text-[13px] font-bold whitespace-nowrap ${
                                            isPendingConfirm ? 'text-amber-800' : 'text-slate-900'
                                          }`}
                                          title="点击快捷修改并确认"
                                        >
                                          {formatCurrency(item.amount)}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[11px] text-slate-500 truncate min-w-0">
                                      <span>{item.institution}</span>
                                      <span className="mx-1 text-slate-300">·</span>
                                      <span className="font-mono-num text-teal-700">
                                        {formatPercent(share)}
                                      </span>
                                      {item.notes && (
                                        <>
                                          <span className="mx-1 text-slate-300">·</span>
                                          <span className="text-slate-400">{item.notes}</span>
                                        </>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 no-print">
                                      {isPendingConfirm && (
                                        <button
                                          type="button"
                                          onClick={() => onConfirmAccount(item.id)}
                                          className="px-1.5 h-7 inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-md"
                                          aria-label="确认余额无误"
                                        >
                                          <Check className="w-3 h-3" />
                                          <span>确认</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onEditAccount(item)}
                                        className="w-7 h-7 inline-flex items-center justify-center text-slate-500 active:bg-slate-100 rounded-md"
                                        aria-label="编辑账户"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteAccount(item.id)}
                                        className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-red-600 active:bg-red-50 rounded-md"
                                        aria-label="删除账户"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Grouped Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white text-[11px] font-medium text-slate-500">
                          <th className="py-2 px-5">账户名称</th>
                          <th className="py-2 px-4">所属机构</th>
                          <th className="py-2 px-4 text-right">占总资产比</th>
                          <th className="py-2 px-4 text-right">月底余额 / 市值</th>
                          <th className="py-2 px-5 text-right no-print">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {memberGroup.categories.map((catGroup) => {
                          const catShare =
                            summary.totalAssets > 0
                              ? (catGroup.subtotal / summary.totalAssets) * 100
                              : 0;

                          return (
                            <React.Fragment key={catGroup.category}>
                              <tr className="bg-slate-50/90 border-y border-slate-100">
                                <td colSpan={2} className="py-2 px-5 font-semibold text-slate-800">
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      className="w-2 h-2 rounded-xs shrink-0"
                                      style={{ backgroundColor: catGroup.color }}
                                    />
                                    <span>{catGroup.category}</span>
                                    <span className="text-[11px] font-normal text-slate-500 font-mono-num">
                                      ({catGroup.items.length} 项 · 金额降序)
                                    </span>
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right font-mono-num text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                                  {formatPercent(catShare)}
                                </td>
                                <td className="py-2 px-4 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                                  {formatCurrency(catGroup.subtotal)}
                                </td>
                                <td className="py-2 px-5 no-print" />
                              </tr>

                              {catGroup.items.map((item) => {
                                const share =
                                  summary.totalAssets > 0
                                    ? (item.amount / summary.totalAssets) * 100
                                    : 0;
                                const isEditingInline = inlineEditId === item.id;

                                const isPendingConfirm = Boolean(item.needsConfirm);

                                return (
                                  <tr
                                    key={item.id}
                                    className={`transition-colors ${
                                      isPendingConfirm
                                        ? 'bg-amber-50/85 hover:bg-amber-100/60'
                                        : 'hover:bg-slate-50/80'
                                    }`}
                                  >
                                    <td className="py-2.5 pl-9 pr-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900">{item.name}</span>
                                        {isPendingConfirm && (
                                          <span className="text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                            待确认
                                          </span>
                                        )}
                                      </div>
                                      {item.notes && (
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                          {item.notes}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                                      {item.institution}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-500 whitespace-nowrap">
                                      {formatPercent(share)}
                                    </td>
                                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                      {isEditingInline ? (
                                        <div className="inline-flex items-center gap-1 justify-end">
                                          <input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            min="0"
                                            autoFocus
                                            value={inlineVal}
                                            onChange={(e) => setInlineVal(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') commitInlineEdit(item.id);
                                              if (e.key === 'Escape') setInlineEditId(null);
                                            }}
                                            className="w-28 h-7 px-2 text-right font-mono-num text-xs bg-white border border-teal-600 rounded focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => commitInlineEdit(item.id)}
                                            className="p-1 text-teal-700 hover:bg-teal-50 rounded"
                                            aria-label="保存金额"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => startInlineEdit(item)}
                                          title="点击快捷修改月底余额并确认"
                                          className={`font-mono-num font-semibold hover:underline cursor-pointer ${
                                            isPendingConfirm
                                              ? 'text-amber-800'
                                              : 'text-slate-900 hover:text-teal-700'
                                          }`}
                                        >
                                          {formatCurrency(item.amount)}
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-5 text-right whitespace-nowrap no-print">
                                      <div className="inline-flex items-center gap-1">
                                        {isPendingConfirm && (
                                          <button
                                            type="button"
                                            onClick={() => onConfirmAccount(item.id)}
                                            className="px-2 py-1 text-[11px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded transition-colors cursor-pointer"
                                          >
                                            确认
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => onEditAccount(item)}
                                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                                          aria-label="编辑账户"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onDeleteAccount(item.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                          aria-label="删除账户"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Credit Card & Loan Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              二、借贷账务与信用卡支出额度明细
            </h3>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              按成员与借贷类别（信用卡 / 消费借贷 / 私人亲友借贷）分开列出并按金额降序排列
            </p>
          </div>
          <span
            className={`font-mono-num text-xs sm:text-sm font-bold ${
              (hasActiveFilter ? filteredLiabilityTotal : summary.totalLiabilities) < 0
                ? 'text-teal-700'
                : 'text-red-600'
            }`}
          >
            {hasActiveFilter ? '筛选借贷小计' : '借贷与信用支出小计'}{' '}
            {formatCurrency(hasActiveFilter ? filteredLiabilityTotal : summary.totalLiabilities)}
          </span>
        </div>

        {liabilityList.length === 0 ? (
          totalMonthLiabilitiesCount > 0 && hasActiveFilter ? (
            <div className="p-8 text-center text-xs text-slate-500">
              没有符合当前搜索或筛选条件的借贷与信用卡账户
            </div>
          ) : (
            <div className="p-8 sm:p-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                {selectedMonth} 暂无借贷或信用卡待还记录
              </p>
              <button
                type="button"
                onClick={() => onOpenAddAccount('liability')}
                className="mt-3 h-10 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                登记借贷 / 信用卡额度
              </button>
            </div>
          )
        ) : (
          <div className="divide-y divide-slate-200">
            {liabilityMemberGroups.map((memberGroup) => (
              <div key={memberGroup.member}>
                {/* Member Group Header */}
                <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900">
                      {memberGroup.member}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono-num">
                      {memberGroup.totalCount} 项
                    </span>
                  </div>
                  <span
                    className={`font-mono-num text-xs sm:text-[13px] font-bold whitespace-nowrap ${
                      memberGroup.subtotal < 0 ? 'text-teal-700' : 'text-red-600'
                    }`}
                  >
                    小计 {formatCurrency(memberGroup.subtotal)}
                  </span>
                </div>

                {/* Mobile Grouped Rows */}
                <div className="md:hidden divide-y divide-slate-200">
                  {memberGroup.categories.map((catGroup) => {
                    const isCardCategory = catGroup.category === '信用卡支出额度';
                    const catUtilPct =
                      isCardCategory && catGroup.creditLimitTotal > 0
                        ? (catGroup.subtotal / catGroup.creditLimitTotal) * 100
                        : null;

                    return (
                      <div key={catGroup.category}>
                        <div className="px-3 py-1.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-xs shrink-0"
                              style={{ backgroundColor: catGroup.color }}
                            />
                            <span className="text-[11px] font-semibold text-slate-700 truncate">
                              {catGroup.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono-num">
                              ({catGroup.items.length})
                            </span>
                          </div>
                          <span
                            className={`font-mono-num text-[11px] font-bold whitespace-nowrap ${
                              catGroup.subtotal < 0 ? 'text-teal-700' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(catGroup.subtotal)}
                            {catUtilPct !== null && (
                              <span className="ml-1 font-normal text-slate-500">
                                / {formatCurrency(catGroup.creditLimitTotal)} (
                                {formatPercent(catUtilPct)})
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {catGroup.items.map((item) => {
                            const isEditingInline = inlineEditId === item.id;
                            const isCreditCard = item.category === '信用卡支出额度';
                            const isNegativeCredit = isCreditCard && item.amount < 0;
                            const utilPct =
                              item.creditLimit && item.creditLimit > 0
                                ? (item.amount / item.creditLimit) * 100
                                : null;

                            const isPendingConfirm = Boolean(item.needsConfirm);

                            return (
                              <div
                                key={item.id}
                                className={`px-3 py-2 space-y-1 transition-colors ${
                                  isPendingConfirm
                                    ? 'bg-amber-50/90 border-l-2 border-l-amber-400'
                                    : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[13px] font-semibold text-slate-900 truncate">
                                      {item.name}
                                    </span>
                                    {isPendingConfirm && (
                                      <span className="text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-1 py-0.2 rounded shrink-0">
                                        待确认
                                      </span>
                                    )}
                                  </div>

                                  <div className="shrink-0">
                                    {isEditingInline ? (
                                      <div className="flex items-center gap-1">
                                        {isCreditCard && (
                                          <button
                                            type="button"
                                            onClick={toggleInlineSign}
                                            className={`h-8 px-1.5 text-xs font-semibold rounded-md border ${
                                              inlineVal.trim().startsWith('-')
                                                ? 'bg-teal-50 border-teal-600 text-teal-800'
                                                : 'bg-slate-50 border-slate-200 text-slate-700'
                                            }`}
                                            title="切换正负"
                                          >
                                            ±
                                          </button>
                                        )}
                                        <input
                                          type="number"
                                          inputMode={isCreditCard ? undefined : 'decimal'}
                                          step="0.01"
                                          min={isCreditCard ? undefined : '0'}
                                          autoFocus
                                          value={inlineVal}
                                          onChange={(e) => setInlineVal(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitInlineEdit(item.id);
                                            if (e.key === 'Escape') setInlineEditId(null);
                                          }}
                                          className="w-22 h-8 px-2 text-right font-mono-num text-sm bg-white border border-teal-600 rounded-md focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => commitInlineEdit(item.id)}
                                          className="w-8 h-8 inline-flex items-center justify-center text-white bg-teal-700 hover:bg-teal-800 rounded-md"
                                          aria-label="保存金额"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => startInlineEdit(item)}
                                        className={`px-1.5 py-0.5 -mr-1.5 rounded active:bg-slate-100 font-mono-num text-[13px] font-bold whitespace-nowrap ${
                                          isPendingConfirm
                                            ? 'text-amber-800'
                                            : isNegativeCredit
                                              ? 'text-teal-700'
                                              : 'text-red-600'
                                        }`}
                                        title="点击快捷修改并确认"
                                      >
                                        {formatCurrency(item.amount)}
                                        {isNegativeCredit && (
                                          <span className="ml-1 text-[10px] font-normal">
                                            溢缴
                                          </span>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[11px] text-slate-500 truncate min-w-0">
                                    <span>{item.institution}</span>
                                    {item.creditLimit && item.creditLimit > 0 ? (
                                      <>
                                        <span className="mx-1 text-slate-300">·</span>
                                        <span
                                          className={`font-mono-num ${
                                            isNegativeCredit
                                              ? 'text-teal-700'
                                              : (utilPct || 0) > 60
                                                ? 'text-red-600 font-semibold'
                                                : ''
                                          }`}
                                        >
                                          授信{formatCurrency(item.creditLimit)} (
                                          {formatPercent(utilPct || 0)})
                                        </span>
                                      </>
                                    ) : (
                                      item.notes && (
                                        <>
                                          <span className="mx-1 text-slate-300">·</span>
                                          <span className="text-slate-400">{item.notes}</span>
                                        </>
                                      )
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 no-print">
                                    {isPendingConfirm && (
                                      <button
                                        type="button"
                                        onClick={() => onConfirmAccount(item.id)}
                                        className="px-1.5 h-7 inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-md"
                                        aria-label="确认借贷金额无误"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>确认</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => onEditAccount(item)}
                                      className="w-7 h-7 inline-flex items-center justify-center text-slate-500 active:bg-slate-100 rounded-md"
                                      aria-label="编辑借贷账户"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteAccount(item.id)}
                                      className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-red-600 active:bg-red-50 rounded-md"
                                      aria-label="删除借贷账户"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {item.creditLimit && item.creditLimit > 0 && (
                                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        (utilPct || 0) > 60 ? 'bg-red-600' : 'bg-amber-600'
                                      }`}
                                      style={{
                                        width: `${Math.max(0, Math.min(100, utilPct || 0))}%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Grouped Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white text-[11px] font-medium text-slate-500">
                        <th className="py-2 px-5">账户 / 借贷项目</th>
                        <th className="py-2 px-4">所属机构 / 对象</th>
                        <th className="py-2 px-4 text-right">授信额度 / 使用率</th>
                        <th className="py-2 px-4 text-right">已用支出 / 待还余额</th>
                        <th className="py-2 px-5 text-right no-print">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberGroup.categories.map((catGroup) => {
                        const isCardCategory = catGroup.category === '信用卡支出额度';
                        const catUtilPct =
                          isCardCategory && catGroup.creditLimitTotal > 0
                            ? (catGroup.subtotal / catGroup.creditLimitTotal) * 100
                            : null;

                        return (
                          <React.Fragment key={catGroup.category}>
                            <tr className="bg-slate-50/90 border-y border-slate-100">
                              <td colSpan={2} className="py-2 px-5 font-semibold text-slate-800">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-xs shrink-0"
                                    style={{ backgroundColor: catGroup.color }}
                                  />
                                  <span>{catGroup.category}</span>
                                  <span className="text-[11px] font-normal text-slate-500 font-mono-num">
                                    ({catGroup.items.length} 项 · 金额降序)
                                  </span>
                                </span>
                              </td>
                              <td className="py-2 px-4 text-right font-mono-num text-[11px] text-slate-500 whitespace-nowrap">
                                {catUtilPct !== null
                                  ? `总授信 ${formatCurrency(catGroup.creditLimitTotal)} (${formatPercent(catUtilPct)})`
                                  : '—'}
                              </td>
                              <td
                                className={`py-2 px-4 text-right font-mono-num font-bold whitespace-nowrap ${
                                  catGroup.subtotal < 0 ? 'text-teal-700' : 'text-red-600'
                                }`}
                              >
                                {formatCurrency(catGroup.subtotal)}
                              </td>
                              <td className="py-2 px-5 no-print" />
                            </tr>

                            {catGroup.items.map((item) => {
                              const isEditingInline = inlineEditId === item.id;
                              const isCreditCard = item.category === '信用卡支出额度';
                              const isNegativeCredit = isCreditCard && item.amount < 0;
                              const utilPct =
                                item.creditLimit && item.creditLimit > 0
                                  ? (item.amount / item.creditLimit) * 100
                                  : null;

                              const isPendingConfirm = Boolean(item.needsConfirm);

                              return (
                                <tr
                                  key={item.id}
                                  className={`transition-colors ${
                                    isPendingConfirm
                                      ? 'bg-amber-50/85 hover:bg-amber-100/60'
                                      : 'hover:bg-slate-50/80'
                                  }`}
                                >
                                  <td className="py-2.5 pl-9 pr-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-slate-900">{item.name}</span>
                                      {isPendingConfirm && (
                                        <span className="text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                          待确认
                                        </span>
                                      )}
                                    </div>
                                    {item.notes && (
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {item.notes}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                                    {item.institution}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono-num text-slate-500 whitespace-nowrap">
                                    {item.creditLimit ? (
                                      <span>
                                        总额 {formatCurrency(item.creditLimit)} ·{' '}
                                        {isNegativeCredit ? (
                                          <strong className="text-teal-700">
                                            溢缴结余（{formatPercent(utilPct || 0)}）
                                          </strong>
                                        ) : (
                                          <>
                                            已用{' '}
                                            <strong
                                              className={
                                                (utilPct || 0) > 60
                                                  ? 'text-red-600'
                                                  : 'text-slate-700'
                                              }
                                            >
                                              {formatPercent(utilPct || 0)}
                                            </strong>
                                          </>
                                        )}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                    {isEditingInline ? (
                                      <div className="inline-flex items-center gap-1 justify-end">
                                        {isCreditCard && (
                                          <button
                                            type="button"
                                            onClick={toggleInlineSign}
                                            className={`h-7 px-1.5 text-[11px] font-semibold rounded border ${
                                              inlineVal.trim().startsWith('-')
                                                ? 'bg-teal-50 border-teal-600 text-teal-800'
                                                : 'bg-slate-50 border-slate-200 text-slate-700'
                                            }`}
                                            title="切换正负"
                                          >
                                            ±
                                          </button>
                                        )}
                                        <input
                                          type="number"
                                          inputMode={isCreditCard ? undefined : 'decimal'}
                                          step="0.01"
                                          min={isCreditCard ? undefined : '0'}
                                          autoFocus
                                          value={inlineVal}
                                          onChange={(e) => setInlineVal(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitInlineEdit(item.id);
                                            if (e.key === 'Escape') setInlineEditId(null);
                                          }}
                                          className="w-28 h-7 px-2 text-right font-mono-num text-xs bg-white border border-teal-600 rounded focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => commitInlineEdit(item.id)}
                                          className="p-1 text-teal-700 hover:bg-teal-50 rounded"
                                          aria-label="保存金额"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => startInlineEdit(item)}
                                        title="点击快捷修改月底金额并确认"
                                        className={`font-mono-num font-semibold hover:underline cursor-pointer ${
                                          isPendingConfirm
                                            ? 'text-amber-800'
                                            : isNegativeCredit
                                              ? 'text-teal-700'
                                              : 'text-red-600'
                                        }`}
                                      >
                                        {formatCurrency(item.amount)}
                                        {isNegativeCredit && (
                                          <span className="ml-1 text-[11px] font-normal">
                                            （溢缴）
                                          </span>
                                        )}
                                      </button>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-5 text-right whitespace-nowrap no-print">
                                    <div className="inline-flex items-center gap-1">
                                      {isPendingConfirm && (
                                        <button
                                          type="button"
                                          onClick={() => onConfirmAccount(item.id)}
                                          className="px-2 py-1 text-[11px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded transition-colors cursor-pointer"
                                        >
                                          确认
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onEditAccount(item)}
                                        className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                                        aria-label="编辑借贷账户"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteAccount(item.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                        aria-label="删除借贷账户"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Long-term Mortgage Principal (Commercial + Provident Fund) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              三、房贷本金汇总与明细（商业贷款 + 公积金贷款）
            </h3>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              每月待还月供已在「固定支出」体现；此处分别录入商贷与公积金剩余本金后自动汇总总额，点击金额可按月更新剩余本金
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-mono-num text-xs sm:text-sm font-bold text-amber-800">
              {hasActiveFilter ? '筛选本金总额' : '贷款本金总额'}{' '}
              {formatCurrency(hasActiveFilter ? filteredMortgageTotal : summary.mortgageTotal)}
            </span>
            <button
              type="button"
              onClick={() => onOpenAddAccount('mortgage')}
              className="inline-flex items-center gap-1 min-h-[30px] sm:min-h-[34px] px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors no-print cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>登记商贷 / 公积金</span>
            </button>
          </div>
        </div>

        {mortgageList.length === 0 ? (
          totalMonthMortgagesCount > 0 && hasActiveFilter ? (
            <div className="p-8 text-center text-xs text-slate-500">
              没有符合当前搜索或筛选条件的房贷本金记录
            </div>
          ) : (
            <div className="p-6 sm:p-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                {selectedMonth} 尚未录入房贷剩余本金
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4 max-w-xl mx-auto leading-relaxed">
                房贷每月待还金额已在「固定支出」体现现金流压力；此处可分别录入<strong>商业贷款本金</strong>与<strong>公积金贷款本金</strong>，系统会自动汇总<strong>贷款本金总额</strong>并逐月继承，不会拉低净货币资产。
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {copySourceMonth && monthItems.length === 0 && (
                  <button
                    type="button"
                    onClick={handleCopyAdjacent}
                    className="h-10 px-4 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg cursor-pointer"
                  >
                    {copyActionLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenAddAccount('mortgage')}
                  className="h-10 px-4 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                >
                  + 登记商业 / 公积金贷款本金
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="divide-y divide-slate-200">
            {!hasActiveFilter && (
              <div className="px-3 sm:px-6 py-2 bg-amber-50/40 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-num">
                  <span className="text-slate-700">
                    商贷{' '}
                    <strong className="text-slate-900">
                      {formatCurrency(summary.mortgageCommercial)}
                    </strong>{' '}
                    <span className="text-slate-400">({formatPercent(commercialShare)})</span>
                  </span>
                  <span className="text-slate-300">+</span>
                  <span className="text-slate-700">
                    公积金{' '}
                    <strong className="text-sky-800">
                      {formatCurrency(summary.mortgageProvident)}
                    </strong>{' '}
                    <span className="text-slate-400">({formatPercent(providentShare)})</span>
                  </span>
                  <span className="text-slate-300">=</span>
                  <span className="text-amber-900 font-semibold">
                    贷款本金总额 {formatCurrency(summary.mortgageTotal)}
                  </span>
                </div>
                {monthlyMortgagePayment > 0 && (
                  <span className="text-slate-500 font-mono-num">
                    本月固定支出房贷月供 {formatCurrency(monthlyMortgagePayment)}
                  </span>
                )}
              </div>
            )}

            {mortgageMemberGroups.map((memberGroup) => {
              const memberShare =
                summary.mortgageTotal > 0
                  ? (memberGroup.subtotal / summary.mortgageTotal) * 100
                  : 0;

              return (
                <div key={memberGroup.member}>
                  {/* Member Group Header */}
                  <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs sm:text-[13px] font-bold text-slate-900">
                        {memberGroup.member}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono-num">
                        {memberGroup.totalCount} 笔 · 占总本金 {formatPercent(memberShare)}
                      </span>
                    </div>
                    <span className="font-mono-num text-xs sm:text-[13px] font-bold text-amber-800 whitespace-nowrap">
                      小计 {formatCurrency(memberGroup.subtotal)}
                    </span>
                  </div>

                  {/* Mobile Grouped Rows */}
                  <div className="md:hidden divide-y divide-slate-200">
                    {memberGroup.categories.map((catGroup) => {
                      const catShare =
                        summary.mortgageTotal > 0
                          ? (catGroup.subtotal / summary.mortgageTotal) * 100
                          : 0;

                      return (
                        <div key={catGroup.category}>
                          <div className="px-3 py-1.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2 h-2 rounded-xs shrink-0"
                                style={{ backgroundColor: catGroup.color }}
                              />
                              <span className="text-[11px] font-semibold text-slate-700 truncate">
                                {catGroup.category}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono-num">
                                ({catGroup.items.length})
                              </span>
                            </div>
                            <span className="font-mono-num text-[11px] font-bold text-slate-800 whitespace-nowrap">
                              {formatCurrency(catGroup.subtotal)}
                              <span className="ml-1 font-normal text-slate-400">
                                ({formatPercent(catShare)})
                              </span>
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {catGroup.items.map((item) => {
                              const share =
                                summary.mortgageTotal > 0
                                  ? (item.amount / summary.mortgageTotal) * 100
                                  : 0;
                              const isEditingInline = inlineEditId === item.id;

                              const isPendingConfirm = Boolean(item.needsConfirm);

                              return (
                                <div
                                  key={item.id}
                                  className={`px-3 py-2 space-y-1 transition-colors ${
                                    isPendingConfirm
                                      ? 'bg-amber-50/90 border-l-2 border-l-amber-400'
                                      : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[13px] font-semibold text-slate-900 truncate">
                                        {item.name}
                                      </span>
                                      {isPendingConfirm && (
                                        <span className="text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-1 py-0.2 rounded shrink-0">
                                          待确认
                                        </span>
                                      )}
                                    </div>

                                    <div className="shrink-0">
                                      {isEditingInline ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            min="0"
                                            autoFocus
                                            value={inlineVal}
                                            onChange={(e) => setInlineVal(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') commitInlineEdit(item.id);
                                              if (e.key === 'Escape') setInlineEditId(null);
                                            }}
                                            className="w-24 h-8 px-2 text-right font-mono-num text-sm bg-white border border-amber-600 rounded-md focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => commitInlineEdit(item.id)}
                                            className="w-8 h-8 inline-flex items-center justify-center text-white bg-amber-700 hover:bg-amber-800 rounded-md"
                                            aria-label="保存剩余本金"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => startInlineEdit(item)}
                                          className="px-1.5 py-0.5 -mr-1.5 rounded active:bg-slate-100 font-mono-num text-[13px] font-bold text-amber-800 whitespace-nowrap"
                                          title="点击快捷更新剩余本金并确认"
                                        >
                                          {formatCurrency(item.amount)}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[11px] text-slate-500 truncate min-w-0">
                                      <span>{item.institution}</span>
                                      <span className="mx-1 text-slate-300">·</span>
                                      <span className="font-mono-num text-amber-800">
                                        占比 {formatPercent(share)}
                                      </span>
                                      {item.notes && (
                                        <>
                                          <span className="mx-1 text-slate-300">·</span>
                                          <span className="text-slate-400">{item.notes}</span>
                                        </>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 no-print">
                                      {isPendingConfirm && (
                                        <button
                                          type="button"
                                          onClick={() => onConfirmAccount(item.id)}
                                          className="px-1.5 h-7 inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-md"
                                          aria-label="确认房贷本金无误"
                                        >
                                          <Check className="w-3 h-3" />
                                          <span>确认</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onEditAccount(item)}
                                        className="w-7 h-7 inline-flex items-center justify-center text-slate-500 active:bg-slate-100 rounded-md"
                                        aria-label="编辑房贷本金"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteAccount(item.id)}
                                        className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-red-600 active:bg-red-50 rounded-md"
                                        aria-label="删除房贷本金"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Grouped Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white text-[11px] font-medium text-slate-500">
                          <th className="py-2 px-5">房贷项目</th>
                          <th className="py-2 px-4">贷款银行 / 公积金中心</th>
                          <th className="py-2 px-4 text-right">占贷款总额比</th>
                          <th className="py-2 px-4 text-right">月底剩余本金</th>
                          <th className="py-2 px-5 text-right no-print">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {memberGroup.categories.map((catGroup) => {
                          const catShare =
                            summary.mortgageTotal > 0
                              ? (catGroup.subtotal / summary.mortgageTotal) * 100
                              : 0;

                          return (
                            <React.Fragment key={catGroup.category}>
                              <tr className="bg-slate-50/90 border-y border-slate-100">
                                <td colSpan={2} className="py-2 px-5 font-semibold text-slate-800">
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      className="w-2 h-2 rounded-xs shrink-0"
                                      style={{ backgroundColor: catGroup.color }}
                                    />
                                    <span>{catGroup.category}</span>
                                    <span className="text-[11px] font-normal text-slate-500 font-mono-num">
                                      ({catGroup.items.length} 笔 · 本金降序)
                                    </span>
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right font-mono-num text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                                  {formatPercent(catShare)}
                                </td>
                                <td className="py-2 px-4 text-right font-mono-num font-bold text-amber-800 whitespace-nowrap">
                                  {formatCurrency(catGroup.subtotal)}
                                </td>
                                <td className="py-2 px-5 no-print" />
                              </tr>

                              {catGroup.items.map((item) => {
                                const share =
                                  summary.mortgageTotal > 0
                                    ? (item.amount / summary.mortgageTotal) * 100
                                    : 0;
                                const isEditingInline = inlineEditId === item.id;

                                const isPendingConfirm = Boolean(item.needsConfirm);

                                return (
                                  <tr
                                    key={item.id}
                                    className={`transition-colors ${
                                      isPendingConfirm
                                        ? 'bg-amber-50/85 hover:bg-amber-100/60'
                                        : 'hover:bg-slate-50/80'
                                    }`}
                                  >
                                    <td className="py-2.5 pl-9 pr-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900">{item.name}</span>
                                        {isPendingConfirm && (
                                          <span className="text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                            待确认
                                          </span>
                                        )}
                                      </div>
                                      {item.notes && (
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                          {item.notes}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                                      {item.institution}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-500 whitespace-nowrap">
                                      {formatPercent(share)}
                                    </td>
                                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                      {isEditingInline ? (
                                        <div className="inline-flex items-center gap-1 justify-end">
                                          <input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            min="0"
                                            autoFocus
                                            value={inlineVal}
                                            onChange={(e) => setInlineVal(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') commitInlineEdit(item.id);
                                              if (e.key === 'Escape') setInlineEditId(null);
                                            }}
                                            className="w-28 h-7 px-2 text-right font-mono-num text-xs bg-white border border-amber-600 rounded focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => commitInlineEdit(item.id)}
                                            className="p-1 text-amber-700 hover:bg-amber-50 rounded"
                                            aria-label="保存剩余本金"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => startInlineEdit(item)}
                                          title="点击快捷更新剩余本金并确认"
                                          className="font-mono-num font-semibold text-amber-800 hover:underline cursor-pointer"
                                        >
                                          {formatCurrency(item.amount)}
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-5 text-right whitespace-nowrap no-print">
                                      <div className="inline-flex items-center gap-1">
                                        {isPendingConfirm && (
                                          <button
                                            type="button"
                                            onClick={() => onConfirmAccount(item.id)}
                                            className="px-2 py-1 text-[11px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded transition-colors cursor-pointer"
                                          >
                                            确认
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => onEditAccount(item)}
                                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                                          aria-label="编辑房贷本金"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onDeleteAccount(item.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                          aria-label="删除房贷本金"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
