import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AssetAllocationChart, AssetTrendChart } from '../components/Charts';
import { ASSET_CATEGORY_META } from '../data/seedData';
import {
  AccountDirection,
  AssetAccountItem,
  AssetMonthTrendPoint,
  AssetSnapshotSummary,
} from '../types/ledger';
import { exportAssetSnapshotToExcel } from '../utils/excel';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface AssetsLiabilitiesViewProps {
  selectedMonth: string;
  selectedYear: string;
  onChangeMonth: (month: string) => void;
  monthItems: AssetAccountItem[];
  allAssetItems: AssetAccountItem[];
  summary: AssetSnapshotSummary;
  annualTrend: AssetMonthTrendPoint[];
  hasPrevMonthData: boolean;
  onCopyFromPrevMonth: (monthKey: string) => number;
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
  annualTrend,
  hasPrevMonthData,
  onCopyFromPrevMonth,
  onOpenAddAccount,
  onEditAccount,
  onQuickUpdateAmount,
  onDeleteAccount,
  onOpenExcelImport,
}) => {
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineVal, setInlineVal] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const metaColorMap = useMemo(
    () => new Map(ASSET_CATEGORY_META.map((m) => [m.category, m.color])),
    []
  );

  const assetList = useMemo(
    () =>
      monthItems
        .filter((a) => a.direction === 'asset')
        .sort((a, b) => b.amount - a.amount),
    [monthItems]
  );

  const liabilityList = useMemo(
    () =>
      monthItems
        .filter((a) => a.direction === 'liability')
        .sort((a, b) => b.amount - a.amount),
    [monthItems]
  );

  const startInlineEdit = (item: AssetAccountItem) => {
    setInlineEditId(item.id);
    setInlineVal(String(item.amount));
  };

  const commitInlineEdit = (id: string) => {
    const num = Number(inlineVal);
    if (Number.isFinite(num) && num >= 0) {
      onQuickUpdateAmount(id, Math.round(num * 100) / 100);
    }
    setInlineEditId(null);
  };

  const handleCopyPrev = () => {
    const added = onCopyFromPrevMonth(selectedMonth);
    setFeedback(
      added > 0
        ? `已沿用上月账户结构，为 ${selectedMonth} 生成 ${added} 个账户条目，可直接更新月底余额。`
        : `${selectedMonth} 已存在相同账户条目或上月无数据可沿用。`
    );
  };

  const netDelta =
    summary.previousNetAssets !== undefined
      ? summary.netMonetaryAssets - summary.previousNetAssets
      : undefined;

  return (
    <div className="space-y-6">
      {/* Header & Action Toolbar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            {selectedMonth} 月底家庭资产借贷统计
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            统计各银行储蓄卡余额、货币基金、积存金、股票账户，以及借贷账务与信用卡已用支出额度
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {hasPrevMonthData && monthItems.length === 0 && (
            <button
              type="button"
              onClick={handleCopyPrev}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>沿用上月账户结构</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenAddAccount('asset')}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>登记货币资产</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAddAccount('liability')}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>登记借贷 / 信用卡</span>
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
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>导出 Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={onOpenExcelImport}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>导入 Excel</span>
          </button>
        </div>
      </section>

      {feedback && (
        <div className="bg-teal-50 border border-teal-200 text-teal-900 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-teal-700 hover:text-teal-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{selectedMonth} · 货币资产总计</div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-teal-700">
            {formatCurrency(summary.totalAssets)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            覆盖 {summary.assetCount} 个储蓄 / 理财 / 证券账户
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{selectedMonth} · 借贷与信用卡待还</div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalLiabilities)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono-num">
            信用卡 {formatCurrency(summary.creditCardSpent)} · 借贷 {formatCurrency(summary.loanTotal)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{selectedMonth} · 净货币资产</div>
          <div
            className={`mt-2 font-mono-num text-2xl font-bold ${
              summary.netMonetaryAssets >= 0 ? 'text-slate-900' : 'text-red-600'
            }`}
          >
            {formatCurrency(summary.netMonetaryAssets)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono-num">
            {netDelta !== undefined
              ? `较上月底 ${formatCurrency(netDelta, true)}`
              : '暂无上月底对照数据'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">信用卡已用额度 / 授信总额</div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {formatPercent(summary.creditCardUtilization)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono-num">
            已用 {formatCurrency(summary.creditCardSpent)} / 授信{' '}
            {formatCurrency(summary.creditCardLimit)}
          </div>
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
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

      {/* Monetary Assets Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              一、货币资产账户明细（储蓄卡 / 货币基金 / 积存金 / 股票账户）
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              点击右侧金额即可快捷修改月底余额
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono-num text-sm font-bold text-teal-700">
              小计 {formatCurrency(summary.totalAssets)}
            </span>
            {hasPrevMonthData && monthItems.length > 0 && (
              <button
                type="button"
                onClick={handleCopyPrev}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors no-print"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>补齐上月缺失账户</span>
              </button>
            )}
          </div>
        </div>

        {assetList.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              {selectedMonth} 尚无货币资产盘点记录
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              可点击「登记货币资产」，或「沿用上月账户结构」快速生成本月盘点表
            </p>
            <div className="flex items-center justify-center gap-3">
              {hasPrevMonthData && (
                <button
                  type="button"
                  onClick={handleCopyPrev}
                  className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg"
                >
                  沿用上月账户结构
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenAddAccount('asset')}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
              >
                新增货币资产
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-5">资产分类</th>
                  <th className="py-2.5 px-4">账户名称</th>
                  <th className="py-2.5 px-4">所属机构</th>
                  <th className="py-2.5 px-4">归属成员</th>
                  <th className="py-2.5 px-4 text-right">占总资产比</th>
                  <th className="py-2.5 px-4 text-right">月底余额 / 市值</th>
                  <th className="py-2.5 px-5 text-right no-print">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assetList.map((item) => {
                  const color = metaColorMap.get(item.category) || '#0F766E';
                  const share =
                    summary.totalAssets > 0 ? (item.amount / summary.totalAssets) * 100 : 0;
                  const isEditingInline = inlineEditId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5 whitespace-nowrap font-medium text-slate-800">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {item.institution}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{item.member}</td>
                      <td className="py-3 px-4 text-right font-mono-num text-slate-500 whitespace-nowrap">
                        {formatPercent(share)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isEditingInline ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input
                              type="number"
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
                            title="点击快捷修改月底余额"
                            className="font-mono-num font-semibold text-slate-900 hover:text-teal-700 hover:underline cursor-pointer"
                          >
                            {formatCurrency(item.amount)}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap no-print">
                        <div className="inline-flex items-center gap-1">
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
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Credit Card & Loan Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              二、借贷账务与信用卡支出额度明细
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              追踪月底信用卡已用待还额度、授信总额度及各类消费贷/亲友借贷余额
            </p>
          </div>
          <span className="font-mono-num text-sm font-bold text-red-600">
            借贷与信用支出小计 {formatCurrency(summary.totalLiabilities)}
          </span>
        </div>

        {liabilityList.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              {selectedMonth} 暂无借贷或信用卡待还记录
            </p>
            <button
              type="button"
              onClick={() => onOpenAddAccount('liability')}
              className="mt-3 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              登记借贷 / 信用卡额度
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-5">借贷类别</th>
                  <th className="py-2.5 px-4">账户 / 借贷项目</th>
                  <th className="py-2.5 px-4">所属机构</th>
                  <th className="py-2.5 px-4">归属成员</th>
                  <th className="py-2.5 px-4 text-right">授信额度 / 使用率</th>
                  <th className="py-2.5 px-4 text-right">已用支出 / 待还余额</th>
                  <th className="py-2.5 px-5 text-right no-print">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liabilityList.map((item) => {
                  const color = metaColorMap.get(item.category) || '#DC2626';
                  const isEditingInline = inlineEditId === item.id;
                  const utilPct =
                    item.creditLimit && item.creditLimit > 0
                      ? (item.amount / item.creditLimit) * 100
                      : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5 whitespace-nowrap font-medium text-slate-800">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {item.institution}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{item.member}</td>
                      <td className="py-3 px-4 text-right font-mono-num text-slate-500 whitespace-nowrap">
                        {item.creditLimit ? (
                          <span>
                            总额 {formatCurrency(item.creditLimit)} · 已用{' '}
                            <strong
                              className={
                                (utilPct || 0) > 60 ? 'text-red-600' : 'text-slate-700'
                              }
                            >
                              {formatPercent(utilPct || 0)}
                            </strong>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isEditingInline ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input
                              type="number"
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
                            title="点击快捷修改月底金额"
                            className="font-mono-num font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            {formatCurrency(item.amount)}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap no-print">
                        <div className="inline-flex items-center gap-1">
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
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
