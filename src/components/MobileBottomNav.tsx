import React from 'react';
import {
  BarChart3,
  CalendarClock,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
} from 'lucide-react';
import { NavSection } from '../types/ledger';

interface MobileBottomNavProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
}

const MOBILE_TABS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: '概览', icon: LayoutDashboard },
  { id: 'templates', label: '固定', icon: CalendarClock },
  { id: 'reports', label: '报表', icon: FileSpreadsheet },
  { id: 'assets', label: '资产', icon: Landmark },
  { id: 'analytics', label: '图表', icon: BarChart3 },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNav,
  onSelectNav,
}) => {
  return (
    <nav
      aria-label="底部快捷导航"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe no-print"
    >
      <div className="grid grid-cols-5 h-14 items-center">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeNav === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectNav(tab.id)}
              className={`min-h-[44px] h-full flex flex-col items-center justify-center gap-0.5 transition-colors whitespace-nowrap ${
                isActive ? 'text-teal-700' : 'text-slate-500 active:text-slate-900'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-teal-700 stroke-[2.25]' : 'text-slate-400'
                }`}
              />
              <span
                className={`text-[11px] leading-none tracking-tight ${
                  isActive ? 'font-semibold text-teal-800' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
