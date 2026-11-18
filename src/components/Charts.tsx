import React, { useMemo, useRef, useState } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import {
  AssetCategoryBreakdownItem,
  AssetMonthTrendPoint,
  CategorySummaryItem,
  MonthlyTrendPoint,
  PeriodMode,
} from '../types/ledger';
import {
  exportSvgAsPng,
  exportSvgElement,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from '../utils/formatters';

interface CashflowTrendChartProps {
  periodMode: PeriodMode;
  periodLabel: string;
  yearKey: string;
  activeMonthKey?: string;
  annualData: MonthlyTrendPoint[];
  showExportButtons?: boolean;
  onSelectMonthPoint?: (monthKey: string) => void;
}

export const CashflowTrendChart: React.FC<CashflowTrendChartProps> = ({
  periodMode,
  periodLabel,
  yearKey,
  activeMonthKey,
  annualData,
  showExportButtons = true,
  onSelectMonthPoint,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 760;
  const height = 300;
  const pad = { top: 28, right: 24, bottom: 38, left: 64 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { maxVal, minVal, yTicks } = useMemo(() => {
    let maxV = 1000;
    let minV = 0;

    for (const p of annualData) {
      maxV = Math.max(maxV, p.income, p.expense, p.disposableIncome);
      minV = Math.min(minV, p.disposableIncome, 0);
    }

    const paddedMax = Math.ceil((maxV * 1.12) / 1000) * 1000;
    const paddedMin = minV < 0 ? Math.floor((minV * 1.1) / 1000) * 1000 : 0;
    const step = (paddedMax - paddedMin) / 4;
    const ticks = [0, 1, 2, 3, 4].map((i) => paddedMin + step * i);
    return { maxVal: paddedMax, minVal: paddedMin, yTicks: ticks };
  }, [annualData]);

  const toY = (v: number) => {
    const ratio = (v - minVal) / (maxVal - minVal || 1);
    return pad.top + plotH - ratio * plotH;
  };

  const zeroY = toY(0);
  const slotW = plotW / Math.max(annualData.length, 1);

  const linePath = useMemo(() => {
    const pts = annualData.map((p, i) => ({
      x: pad.left + slotW * i + slotW / 2,
      y: toY(p.disposableIncome),
    }));
    if (pts.length === 0) return '';
    return pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  }, [annualData, slotW, maxVal, minVal]);

  const hoveredItem = hoverIdx !== null ? annualData[hoverIdx] : null;
  const highlightMonthNum = activeMonthKey ? Number(activeMonthKey.slice(5)) : null;

  const chartTitle =
    periodMode === 'month' && highlightMonthNum
      ? `${yearKey}年 逐月收支与可支配收入趋势（当前聚焦：${highlightMonthNum}月）`
      : `${yearKey} 年度 逐月收支与可支配收入趋势`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900">{chartTitle}</h3>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-700 inline-block" />
              家庭收入
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
              硬性支出
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-600 inline-block" />
              当月可支配收入
            </span>
          </div>
        </div>

        {showExportButtons && (
          <div className="flex items-center gap-2 shrink-0 no-print">
            <button
              type="button"
              onClick={() =>
                exportSvgAsPng(
                  svgRef.current,
                  `月度收支与可支配趋势_${periodLabel.replace(/\s+/g, '')}.png`,
                  chartTitle
                )
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>导出 PNG</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportSvgElement(
                  svgRef.current,
                  `月度收支与可支配趋势_${periodLabel.replace(/\s+/g, '')}.svg`
                )
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>SVG</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Tooltip Strip */}
      <div className="h-7 mb-2 flex items-center justify-between text-xs px-3 bg-slate-50 border border-slate-100 rounded-lg">
        {hoveredItem ? (
          <div className="flex flex-wrap items-center gap-4 text-slate-700">
            <span className="font-semibold text-slate-900">{hoveredItem.monthKey}</span>
            <span className="font-mono-num">
              收入：<strong className="text-teal-700">{formatCurrency(hoveredItem.income)}</strong>
            </span>
            <span className="font-mono-num">
              硬性支出：
              <strong className="text-amber-700">{formatCurrency(hoveredItem.expense)}</strong>
            </span>
            <span className="font-mono-num">
              可支配收入：
              <strong
                className={hoveredItem.disposableIncome >= 0 ? 'text-sky-700' : 'text-red-600'}
              >
                {formatCurrency(hoveredItem.disposableIncome, true)}
              </strong>
            </span>
          </div>
        ) : (
          <span className="text-slate-400">
            悬停查看各月收支对比，点击任意月份柱区可快速切换所选月份
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[560px]"
          style={{ fontFamily: '"DM Sans", "Noto Sans SC", sans-serif' }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {yTicks.map((tick, i) => {
            const y = toY(tick);
            return (
              <g key={i}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  stroke={tick === 0 ? '#CBD5E1' : '#F1F5F9'}
                  strokeWidth={tick === 0 ? 1.5 : 1}
                />
                <text
                  x={pad.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="11"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            );
          })}

          {annualData.map((p, i) => {
            const cx = pad.left + slotW * i + slotW / 2;
            const barW = Math.min(18, slotW * 0.3);
            const incH = Math.max(0, zeroY - toY(p.income));
            const expH = Math.max(0, zeroY - toY(p.expense));
            const isHovered = hoverIdx === i;
            const isSelectedMonth = periodMode === 'month' && activeMonthKey === p.monthKey;
            const barOpacity =
              hoverIdx !== null
                ? isHovered
                  ? 0.95
                  : 0.4
                : periodMode === 'month' && activeMonthKey
                  ? isSelectedMonth
                    ? 0.98
                    : 0.45
                  : 0.9;

            return (
              <g
                key={p.monthKey}
                className={onSelectMonthPoint ? 'cursor-pointer' : undefined}
                onMouseEnter={() => setHoverIdx(i)}
                onClick={() => onSelectMonthPoint && onSelectMonthPoint(p.monthKey)}
              >
                {(isHovered || isSelectedMonth) && (
                  <rect
                    x={pad.left + slotW * i + 2}
                    y={pad.top}
                    width={slotW - 4}
                    height={plotH}
                    fill={isSelectedMonth ? '#F0FDFA' : '#F8FAFC'}
                    stroke={isSelectedMonth ? '#99F6E4' : 'none'}
                    strokeWidth={1}
                    rx={4}
                  />
                )}
                <rect
                  x={cx - barW - 1.5}
                  y={toY(p.income)}
                  width={barW}
                  height={incH}
                  fill="#0F766E"
                  opacity={barOpacity}
                  rx={2}
                />
                <rect
                  x={cx + 1.5}
                  y={toY(p.expense)}
                  width={barW}
                  height={expH}
                  fill="#D97706"
                  opacity={barOpacity}
                  rx={2}
                />
                <text
                  x={cx}
                  y={height - 12}
                  textAnchor="middle"
                  fill={isSelectedMonth ? '#0F766E' : isHovered ? '#0F172A' : '#64748B'}
                  fontWeight={isSelectedMonth || isHovered ? 700 : 400}
                  fontSize="11"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0284C7"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {annualData.map((p, i) => {
            const cx = pad.left + slotW * i + slotW / 2;
            const cy = toY(p.disposableIncome);
            const isSelectedMonth = periodMode === 'month' && activeMonthKey === p.monthKey;
            return (
              <circle
                key={`pt-${p.monthKey}`}
                cx={cx}
                cy={cy}
                r={hoverIdx === i || isSelectedMonth ? 4.5 : 3}
                fill="#FFFFFF"
                stroke="#0284C7"
                strokeWidth={2}
                pointerEvents="none"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

interface CategoryBreakdownChartProps {
  periodLabel: string;
  incomeItems: CategorySummaryItem[];
  expenseItems: CategorySummaryItem[];
  totalIncome: number;
  totalExpense: number;
  showExportButtons?: boolean;
  onClickCategory?: (categoryId: string) => void;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  periodLabel,
  incomeItems,
  expenseItems,
  totalIncome,
  totalExpense,
  showExportButtons = true,
  onClickCategory,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<'fixed_expense' | 'income'>('fixed_expense');
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);

  const items = mode === 'fixed_expense' ? expenseItems : incomeItems;
  const total = mode === 'fixed_expense' ? totalExpense : totalIncome;

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 74;
  const strokeW = 24;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(() => {
    let offset = 0;
    return items.map((item) => {
      const fraction = total > 0 ? item.total / total : 0;
      const dashLen = fraction * circumference;
      const seg = {
        ...item,
        dashArray: `${Math.max(dashLen - 1.5, 0)} ${circumference}`,
        dashOffset: -offset,
      };
      offset += dashLen;
      return seg;
    });
  }, [items, total, circumference]);

  const activeSeg = segments.find((s) => s.categoryId === hoveredCatId);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('fixed_expense')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'fixed_expense'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            硬性支出结构
          </button>
          <button
            type="button"
            onClick={() => setMode('income')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'income'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            家庭收入结构
          </button>
        </div>

        {showExportButtons && items.length > 0 && (
          <div className="flex items-center gap-1.5 no-print">
            <button
              type="button"
              onClick={() =>
                exportSvgAsPng(
                  svgRef.current,
                  `${mode === 'fixed_expense' ? '硬性支出结构图' : '收入结构图'}_${periodLabel.replace(/\s+/g, '')}.png`,
                  `${periodLabel} · ${mode === 'fixed_expense' ? '硬性支出分类占比' : '家庭收入分类占比'}`
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportSvgElement(
                  svgRef.current,
                  `${mode === 'fixed_expense' ? '硬性支出结构图' : '收入结构图'}_${periodLabel.replace(/\s+/g, '')}.svg`
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>SVG</span>
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-slate-600">当前周期暂无此类数据</p>
          <p className="text-xs text-slate-400 mt-1">登记收支或导入 Excel 后即可生成分类结构图</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
          <div className="shrink-0">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${size} ${size}`}
              className="w-44 h-44"
              style={{ fontFamily: '"DM Sans", "Noto Sans SC", sans-serif' }}
            >
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeW} />
              <g transform={`rotate(-90 ${cx} ${cy})`}>
                {segments.map((seg) => {
                  const isActive = hoveredCatId === seg.categoryId;
                  return (
                    <circle
                      key={seg.categoryId}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isActive ? strokeW + 4 : strokeW}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      opacity={hoveredCatId === null || isActive ? 1 : 0.35}
                      className="transition-opacity duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredCatId(seg.categoryId)}
                      onMouseLeave={() => setHoveredCatId(null)}
                      onClick={() => onClickCategory && onClickCategory(seg.categoryId)}
                    />
                  );
                })}
              </g>
              <text x={cx} y={cy - 8} textAnchor="middle" fill="#64748B" fontSize="11">
                {activeSeg
                  ? activeSeg.categoryName
                  : mode === 'fixed_expense'
                    ? '硬性支出合计'
                    : '家庭收入合计'}
              </text>
              <text
                x={cx}
                y={cy + 13}
                textAnchor="middle"
                fill="#0F172A"
                fontSize="14"
                fontWeight="700"
                fontFamily='"JetBrains Mono", monospace'
              >
                {formatCompactCurrency(activeSeg ? activeSeg.total : total)}
              </text>
              {activeSeg && (
                <text
                  x={cx}
                  y={cy + 30}
                  textAnchor="middle"
                  fill="#0F766E"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {formatPercent(activeSeg.sharePercent)}
                </text>
              )}
            </svg>
          </div>

          <div className="flex-1 w-full space-y-2.5 overflow-y-auto max-h-60 pr-1">
            {items.map((item) => {
              const isActive = hoveredCatId === item.categoryId;
              return (
                <button
                  key={item.categoryId}
                  type="button"
                  onMouseEnter={() => setHoveredCatId(item.categoryId)}
                  onMouseLeave={() => setHoveredCatId(null)}
                  onClick={() => onClickCategory && onClickCategory(item.categoryId)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                    isActive ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 font-medium text-slate-800 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.categoryName}</span>
                    </span>
                    <span className="font-mono-num text-slate-900 font-semibold shrink-0">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, item.sharePercent)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <span className="font-mono-num text-[11px] text-slate-500 w-11 text-right shrink-0">
                      {formatPercent(item.sharePercent)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface MemberContributionChartProps {
  periodLabel: string;
  memberData: { member: string; income: number; expense: number }[];
  expenseRatio: number;
  disposableRate: number;
  showExportButtons?: boolean;
}

export const MemberContributionChart: React.FC<MemberContributionChartProps> = ({
  periodLabel,
  memberData,
  expenseRatio,
  disposableRate,
  showExportButtons = true,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = 460;
  const rowH = 44;
  const padTop = 18;
  const padLeft = 72;
  const padRight = 24;
  const height = Math.max(160, padTop + memberData.length * rowH + 24);
  const barAreaW = width - padLeft - padRight;

  const maxMemberVal = useMemo(() => {
    let m = 1000;
    for (const d of memberData) {
      m = Math.max(m, d.income, d.expense);
    }
    return m * 1.15;
  }, [memberData]);

  const clampedExpenseRatio = Math.min(100, Math.max(0, expenseRatio));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900">
            家庭成员收支分布与可支配比例
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            评估各成员收入贡献与固定支出归属结构
          </p>
        </div>

        {showExportButtons && memberData.length > 0 && (
          <div className="flex items-center gap-1.5 no-print">
            <button
              type="button"
              onClick={() =>
                exportSvgAsPng(
                  svgRef.current,
                  `成员收支分布_${periodLabel.replace(/\s+/g, '')}.png`,
                  `${periodLabel} · 家庭成员收支对比`
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportSvgElement(
                  svgRef.current,
                  `成员收支分布_${periodLabel.replace(/\s+/g, '')}.svg`
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>SVG</span>
            </button>
          </div>
        )}
      </div>

      <div className="pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-600 font-medium">硬性支出占比 vs 可支配收入比例</span>
          <span className="font-mono-num font-semibold text-slate-900">
            硬性支出 {formatPercent(expenseRatio)} · 可支配 {formatPercent(Math.max(0, disposableRate))}
          </span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-300 ${
              expenseRatio > 70
                ? 'bg-red-600'
                : expenseRatio > 50
                  ? 'bg-amber-600'
                  : 'bg-teal-700'
            }`}
            style={{ width: `${clampedExpenseRatio}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
          <span>参考标准：硬性支出 ≤ 50%</span>
          <span>
            {expenseRatio === 0
              ? '暂无收入数据'
              : expenseRatio <= 50
                ? '可支配空间充足'
                : expenseRatio <= 70
                  ? '硬性支出偏高，留意日常开销控制'
                  : '刚性负担过重'}
          </span>
        </div>
      </div>

      {memberData.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400">暂无成员收支记录</div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ fontFamily: '"DM Sans", "Noto Sans SC", sans-serif' }}
        >
          {memberData.map((d, i) => {
            const y = padTop + i * rowH;
            const incW = (d.income / maxMemberVal) * barAreaW;
            const expW = (d.expense / maxMemberVal) * barAreaW;
            return (
              <g key={d.member}>
                <text
                  x={padLeft - 10}
                  y={y + 17}
                  textAnchor="end"
                  fill="#334155"
                  fontSize="12"
                  fontWeight="500"
                >
                  {d.member}
                </text>
                <rect
                  x={padLeft}
                  y={y + 3}
                  width={Math.max(incW, 2)}
                  height={11}
                  fill="#0F766E"
                  rx={2}
                />
                <text
                  x={padLeft + Math.max(incW, 2) + 6}
                  y={y + 12}
                  fill="#0F766E"
                  fontSize="10.5"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  收 {formatCompactCurrency(d.income)}
                </text>

                <rect
                  x={padLeft}
                  y={y + 18}
                  width={Math.max(expW, 2)}
                  height={11}
                  fill="#D97706"
                  rx={2}
                />
                <text
                  x={padLeft + Math.max(expW, 2) + 6}
                  y={y + 27}
                  fill="#B45309"
                  fontSize="10.5"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  支 {formatCompactCurrency(d.expense)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

// --- Asset & Credit/Loan Visualization Charts ---

interface AssetTrendChartProps {
  yearKey: string;
  activeMonthKey?: string;
  data: AssetMonthTrendPoint[];
  onSelectMonth?: (monthKey: string) => void;
}

export const AssetTrendChart: React.FC<AssetTrendChartProps> = ({
  yearKey,
  activeMonthKey,
  data,
  onSelectMonth,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 760;
  const height = 280;
  const pad = { top: 26, right: 24, bottom: 36, left: 68 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { maxVal, minVal, yTicks } = useMemo(() => {
    let maxV = 10000;
    let minV = 0;
    for (const p of data) {
      maxV = Math.max(maxV, p.totalAssets, p.totalLiabilities, p.netAssets);
      minV = Math.min(minV, p.netAssets, 0);
    }
    const paddedMax = Math.ceil((maxV * 1.12) / 10000) * 10000;
    const paddedMin = minV < 0 ? Math.floor((minV * 1.1) / 10000) * 10000 : 0;
    const step = (paddedMax - paddedMin) / 4;
    return {
      maxVal: paddedMax,
      minVal: paddedMin,
      yTicks: [0, 1, 2, 3, 4].map((i) => paddedMin + step * i),
    };
  }, [data]);

  const toY = (v: number) => {
    const ratio = (v - minVal) / (maxVal - minVal || 1);
    return pad.top + plotH - ratio * plotH;
  };
  const zeroY = toY(0);
  const slotW = plotW / Math.max(data.length, 1);

  const netLinePath = useMemo(() => {
    return data
      .map((p, i) => {
        const x = pad.left + slotW * i + slotW / 2;
        const y = toY(p.netAssets);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, slotW, maxVal, minVal]);

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900">
            {yearKey} 年度月底货币资产与借贷净值趋势
          </h3>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-700 inline-block" />
              货币资产总额
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" />
              借贷与信用卡支出
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-indigo-600 inline-block" />
              净货币资产
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 no-print">
          <button
            type="button"
            onClick={() =>
              exportSvgAsPng(
                svgRef.current,
                `月底资产借贷趋势_${yearKey}年.png`,
                `${yearKey} 年度 · 月底家庭货币资产与借贷趋势`
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>导出 PNG</span>
          </button>
          <button
            type="button"
            onClick={() =>
              exportSvgElement(svgRef.current, `月底资产借贷趋势_${yearKey}年.svg`)
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>SVG</span>
          </button>
        </div>
      </div>

      <div className="h-7 mb-2 flex items-center text-xs px-3 bg-slate-50 border border-slate-100 rounded-lg">
        {hovered ? (
          <div className="flex flex-wrap items-center gap-4 text-slate-700">
            <span className="font-semibold text-slate-900">{hovered.monthKey}</span>
            <span className="font-mono-num">
              货币资产：<strong className="text-teal-700">{formatCurrency(hovered.totalAssets)}</strong>
            </span>
            <span className="font-mono-num">
              借贷与信用卡：
              <strong className="text-red-600">{formatCurrency(hovered.totalLiabilities)}</strong>
            </span>
            <span className="font-mono-num">
              净货币资产：<strong className="text-indigo-700">{formatCurrency(hovered.netAssets)}</strong>
            </span>
          </div>
        ) : (
          <span className="text-slate-400">悬停查看各月底货币资产盘点，点击月份切换盘点账期</span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[560px]"
          style={{ fontFamily: '"DM Sans", "Noto Sans SC", sans-serif' }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {yTicks.map((tick, i) => {
            const y = toY(tick);
            return (
              <g key={i}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  stroke={tick === 0 ? '#CBD5E1' : '#F1F5F9'}
                  strokeWidth={tick === 0 ? 1.5 : 1}
                />
                <text
                  x={pad.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="11"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            );
          })}

          {data.map((p, i) => {
            const cx = pad.left + slotW * i + slotW / 2;
            const barW = Math.min(18, slotW * 0.3);
            const isHovered = hoverIdx === i;
            const isActive = activeMonthKey === p.monthKey;
            return (
              <g
                key={p.monthKey}
                className={onSelectMonth ? 'cursor-pointer' : undefined}
                onMouseEnter={() => setHoverIdx(i)}
                onClick={() => onSelectMonth && onSelectMonth(p.monthKey)}
              >
                {(isHovered || isActive) && (
                  <rect
                    x={pad.left + slotW * i + 2}
                    y={pad.top}
                    width={slotW - 4}
                    height={plotH}
                    fill={isActive ? '#F0FDFA' : '#F8FAFC'}
                    rx={4}
                  />
                )}
                <rect
                  x={cx - barW - 1.5}
                  y={toY(p.totalAssets)}
                  width={barW}
                  height={Math.max(0, zeroY - toY(p.totalAssets))}
                  fill="#0F766E"
                  opacity={hoverIdx === null || isHovered || isActive ? 0.9 : 0.45}
                  rx={2}
                />
                <rect
                  x={cx + 1.5}
                  y={toY(p.totalLiabilities)}
                  width={barW}
                  height={Math.max(0, zeroY - toY(p.totalLiabilities))}
                  fill="#DC2626"
                  opacity={hoverIdx === null || isHovered || isActive ? 0.85 : 0.4}
                  rx={2}
                />
                <text
                  x={cx}
                  y={height - 12}
                  textAnchor="middle"
                  fill={isActive ? '#0F766E' : isHovered ? '#0F172A' : '#64748B'}
                  fontWeight={isActive || isHovered ? 700 : 400}
                  fontSize="11"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          <path
            d={netLinePath}
            fill="none"
            stroke="#4F46E5"
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {data.map((p, i) => (
            <circle
              key={`npt-${p.monthKey}`}
              cx={pad.left + slotW * i + slotW / 2}
              cy={toY(p.netAssets)}
              r={hoverIdx === i || activeMonthKey === p.monthKey ? 4.5 : 3}
              fill="#FFFFFF"
              stroke="#4F46E5"
              strokeWidth={2}
              pointerEvents="none"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

interface AssetAllocationChartProps {
  monthKey: string;
  assetsByCategory: AssetCategoryBreakdownItem[];
  totalAssets: number;
}

export const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({
  monthKey,
  assetsByCategory,
  totalAssets,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const strokeW = 22;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(() => {
    let offset = 0;
    return assetsByCategory.map((item) => {
      const fraction = totalAssets > 0 ? item.total / totalAssets : 0;
      const dashLen = fraction * circumference;
      const seg = {
        ...item,
        dashArray: `${Math.max(dashLen - 1.5, 0)} ${circumference}`,
        dashOffset: -offset,
      };
      offset += dashLen;
      return seg;
    });
  }, [assetsByCategory, totalAssets, circumference]);

  const activeSeg = segments.find((s) => s.category === hoveredCat);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900">
            {monthKey} 货币资产配置结构
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">储蓄卡、货币基金、积存金与股票占比</p>
        </div>

        {assetsByCategory.length > 0 && (
          <div className="flex items-center gap-1.5 no-print">
            <button
              type="button"
              onClick={() =>
                exportSvgAsPng(
                  svgRef.current,
                  `货币资产配置图_${monthKey}.png`,
                  `${monthKey} · 家庭货币资产配置占比`
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportSvgElement(svgRef.current, `货币资产配置图_${monthKey}.svg`)
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>SVG</span>
            </button>
          </div>
        )}
      </div>

      {assetsByCategory.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10 text-xs text-slate-400">
          当月暂无货币资产盘点数据
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-5 flex-1">
          <div className="shrink-0">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${size} ${size}`}
              className="w-40 h-40"
              style={{ fontFamily: '"DM Sans", "Noto Sans SC", sans-serif' }}
            >
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeW} />
              <g transform={`rotate(-90 ${cx} ${cy})`}>
                {segments.map((seg) => {
                  const isActive = hoveredCat === seg.category;
                  return (
                    <circle
                      key={seg.category}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isActive ? strokeW + 3 : strokeW}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      opacity={hoveredCat === null || isActive ? 1 : 0.35}
                      className="transition-opacity duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredCat(seg.category)}
                      onMouseLeave={() => setHoveredCat(null)}
                    />
                  );
                })}
              </g>
              <text x={cx} y={cy - 8} textAnchor="middle" fill="#64748B" fontSize="11">
                {activeSeg ? activeSeg.category : '货币资产合计'}
              </text>
              <text
                x={cx}
                y={cy + 12}
                textAnchor="middle"
                fill="#0F172A"
                fontSize="13.5"
                fontWeight="700"
                fontFamily='"JetBrains Mono", monospace'
              >
                {formatCompactCurrency(activeSeg ? activeSeg.total : totalAssets)}
              </text>
              {activeSeg && (
                <text
                  x={cx}
                  y={cy + 28}
                  textAnchor="middle"
                  fill="#0F766E"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {formatPercent(activeSeg.sharePercent)}
                </text>
              )}
            </svg>
          </div>

          <div className="flex-1 w-full space-y-2.5">
            {assetsByCategory.map((item) => (
              <div
                key={item.category}
                onMouseEnter={() => setHoveredCat(item.category)}
                onMouseLeave={() => setHoveredCat(null)}
                className="px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="flex items-center gap-2 font-medium text-slate-800">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.category}
                  </span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {formatCurrency(item.total)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, item.sharePercent)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="font-mono-num text-[11px] text-slate-500 w-11 text-right">
                    {formatPercent(item.sharePercent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
