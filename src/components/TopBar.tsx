import React from 'react';
import { ChevronLeft, ChevronRight, Menu, Plus } from 'lucide-react';
import { NavSection, PeriodMode } from '../types/ledger';

interface TopBarProps {
  activeNav: NavSection;
  periodMode: PeriodMode;
  onChangePeriodMode: (mode: PeriodMode) => void;
  selectedMonth: string; // YYYY-MM
  onChangeMonth: (month: string) => void;
  selectedYear: string; // YYYY
  onChangeYear: (year: string) => void;
  availableYears: string[];
  onOpenAddEntry: () => void;
  onOpenMobileNav: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  overview: '收支概览',
  templates: '固定开支模板',
  reports: '收支汇总报表',
  assets: '家庭资产借贷',
  analytics: '图表分析与导出',
  tags: '分类标签管理',
};

function stepMonth(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeNav,
  periodMode,
  onChangePeriodMode,
  selectedMonth,
  onChangeMonth,
  selectedYear,
  onChangeYear,
  availableYears,
  onOpenAddEntry,
  onOpenMobileNav,
}) => {
  const [yearPart, monthPart] = selectedMonth.split('-');

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 lg:px-8 h-12 lg:h-16 flex items-center justify-between gap-3 no-print">
        {/* Left: Mobile drawer menu + Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden min-w-[44px] min-h-[44px] -ml-1.5 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 active:bg-slate-100"
            aria-label="打开工具与标签菜单"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-500 hidden sm:inline whitespace-nowrap">家庭账本</span>
            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
              /
            </span>
            <h1 className="font-display text-sm sm:text-base font-semibold text-slate-900 truncate">
              {SECTION_LABELS[activeNav]}
            </h1>
          </div>
        </div>

        {/* Right: Desktop Period Controls + Primary CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Desktop / Tablet Segmented Period Mode */}
          <div
            className="hidden lg:flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 shrink-0"
            role="group"
            aria-label="统计周期模式"
          >
            <button
              type="button"
              onClick={() => onChangePeriodMode('month')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                periodMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              按月视图
            </button>
            <button
              type="button"
              onClick={() => onChangePeriodMode('year')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                periodMode === 'year'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              按年视图
            </button>
          </div>

          {/* Desktop Date Selector */}
          <div className="hidden lg:block">
            {periodMode === 'month' ? (
              <div className="flex items-center border border-slate-200 rounded-lg bg-white h-9">
                <button
                  type="button"
                  onClick={() => onChangeMonth(stepMonth(selectedMonth, -1))}
                  className="px-2 h-full text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg transition-colors"
                  aria-label="上一月"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) onChangeMonth(e.target.value);
                  }}
                  aria-label="选择月份"
                  className="px-2 text-xs font-medium font-mono-num text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
                <span className="sr-only">
                  {yearPart}年{Number(monthPart)}月
                </span>
                <button
                  type="button"
                  onClick={() => onChangeMonth(stepMonth(selectedMonth, 1))}
                  className="px-2 h-full text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition-colors"
                  aria-label="下一月"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => onChangeYear(e.target.value)}
                aria-label="选择年份"
                className="h-9 px-3 text-xs font-medium font-mono-num text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y} 年度
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onOpenAddEntry}
            className="inline-flex items-center justify-center gap-1.5 h-9 lg:h-9 px-3.5 sm:px-4 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 active:scale-[0.98] rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>记一笔</span>
          </button>
        </div>
      </header>

      {/* Non-sticky Mobile Period Control Bar (scrolls naturally, keeps sticky chrome <15% height) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 no-print">
        <div
          className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 shrink-0"
          role="group"
          aria-label="移动端统计周期模式"
        >
          <button
            type="button"
            onClick={() => onChangePeriodMode('month')}
            className={`px-3 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              periodMode === 'month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            按月
          </button>
          <button
            type="button"
            onClick={() => onChangePeriodMode('year')}
            className={`px-3 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              periodMode === 'year'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            按年
          </button>
        </div>

        {periodMode === 'month' ? (
          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/70 min-h-[38px]">
            <button
              type="button"
              onClick={() => onChangeMonth(stepMonth(selectedMonth, -1))}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-600 active:bg-slate-200/70 rounded-l-lg"
              aria-label="上一月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) onChangeMonth(e.target.value);
              }}
              aria-label="选择月份"
              className="px-1.5 text-xs font-semibold font-mono-num text-slate-900 bg-transparent focus:outline-none text-center w-[108px]"
            />
            <button
              type="button"
              onClick={() => onChangeMonth(stepMonth(selectedMonth, 1))}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-600 active:bg-slate-200/70 rounded-r-lg"
              aria-label="下一月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <select
            value={selectedYear}
            onChange={(e) => onChangeYear(e.target.value)}
            aria-label="选择年份"
            className="min-h-[38px] px-3 text-xs font-semibold font-mono-num text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y} 年度
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
};
