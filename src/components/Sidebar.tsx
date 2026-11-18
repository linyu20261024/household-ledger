import React from 'react';
import {
  BarChart3,
  CalendarClock,
  Download,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  RotateCcw,
  Tags,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { NavSection } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';

interface SidebarProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  monthlyTemplateBaseline: number;
  activeTemplateCount: number;
  latestNetAssets: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onExportFullExcel: () => void;
  onOpenExcelImport: () => void;
  onResetDemoData: () => void;
  onClearAllData: () => void;
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: '收支概览', icon: LayoutDashboard },
  { id: 'templates', label: '固定开支模板', icon: CalendarClock },
  { id: 'reports', label: '收支汇总报表', icon: FileSpreadsheet },
  { id: 'assets', label: '家庭资产借贷', icon: Landmark },
  { id: 'analytics', label: '图表分析与导出', icon: BarChart3 },
  { id: 'tags', label: '分类标签管理', icon: Tags },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onSelectNav,
  monthlyTemplateBaseline,
  activeTemplateCount,
  latestNetAssets,
  mobileOpen,
  onCloseMobile,
  onExportFullExcel,
  onOpenExcelImport,
  onResetDemoData,
  onClearAllData,
}) => {
  const content = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 select-none">
      {/* Brand Wordmark */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200 shrink-0">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          家计账本
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          aria-label="关闭导航菜单"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectNav(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-teal-50 text-teal-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-teal-700' : 'text-slate-400'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Baseline & Excel Actions */}
      <div className="p-4 border-t border-slate-200 space-y-4">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-500">每月硬性开支基线</div>
            <div className="font-mono-num text-sm font-semibold text-slate-900 mt-0.5">
              {formatCurrency(monthlyTemplateBaseline)}
            </div>
            <div className="text-[11px] text-slate-400">
              已启用 {activeTemplateCount} 项固定扣款
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100">
            <div className="text-xs text-slate-500">当期净货币资产</div>
            <div className="font-mono-num text-sm font-semibold text-teal-700 mt-0.5">
              {formatCurrency(latestNetAssets)}
            </div>
          </div>
        </div>

        {/* Excel Quick Import / Export */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onOpenExcelImport();
              onCloseMobile();
            }}
            className="inline-flex items-center justify-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Excel导入</span>
          </button>
          <button
            type="button"
            onClick={onExportFullExcel}
            className="inline-flex items-center justify-center gap-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel导出</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onResetDemoData}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 py-1 px-2 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>填充示例</span>
          </button>
          <button
            type="button"
            onClick={onClearAllData}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 py-1 px-2 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空账本</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[248px] shrink-0 h-screen sticky top-0 no-print">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">{content}</aside>
        </div>
      )}
    </>
  );
};
