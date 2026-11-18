import React, { useState } from 'react';
import { CalendarCheck2, CopyCheck, FileSpreadsheet, Pencil, Plus, Power, Trash2, Upload } from 'lucide-react';
import { CategoryTag, FixedExpenseTemplate } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';

interface FixedTemplatesViewProps {
  templates: FixedExpenseTemplate[];
  tags: CategoryTag[];
  selectedMonth: string;
  selectedYear: string;
  existingTemplateIdsForMonth: Set<string>;
  onOpenAddTemplate: () => void;
  onEditTemplate: (tpl: FixedExpenseTemplate) => void;
  onToggleTemplateActive: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onGenerateForMonth: (monthKey: string) => number;
  onGenerateForYear: (yearKey: string) => number;
  onExportExcel: () => void;
  onOpenExcelImport: () => void;
}

export const FixedTemplatesView: React.FC<FixedTemplatesViewProps> = ({
  templates,
  tags,
  selectedMonth,
  selectedYear,
  existingTemplateIdsForMonth,
  onOpenAddTemplate,
  onEditTemplate,
  onToggleTemplateActive,
  onDeleteTemplate,
  onGenerateForMonth,
  onGenerateForYear,
  onExportExcel,
  onOpenExcelImport,
}) => {
  const [targetMonth, setTargetMonth] = useState(selectedMonth);
  const [feedback, setFeedback] = useState<string | null>(null);

  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const activeTemplates = templates.filter((t) => t.active);
  const monthlyBaseline = activeTemplates.reduce((acc, t) => acc + t.amount, 0);
  const annualBaseline = monthlyBaseline * 12;

  const sortedTemplates = [...templates].sort((a, b) => a.dueDay - b.dueDay);

  const handleGenerateMonth = () => {
    const added = onGenerateForMonth(targetMonth);
    setFeedback(
      added > 0
        ? `已成功为 ${targetMonth} 登记 ${added} 项固定开支记录。`
        : `${targetMonth} 的已启用固定开支模板均已登记，无需重复生成。`
    );
  };

  const handleGenerateYear = () => {
    const added = onGenerateForYear(selectedYear);
    setFeedback(
      added > 0
        ? `已为 ${selectedYear} 年度各月份补齐 ${added} 笔缺失的固定开支记录。`
        : `${selectedYear} 年度 1–12 月均已包含全部启用的固定开支记录。`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Baseline Metrics */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              每月固定硬性开支登记表
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              将房贷房租、物业水电、教育托育、保险保费等每月刚性支出登记为固定模板，支持一键批量导入任意月份或全年，自动汇总进收支报表。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>导出 Excel</span>
            </button>
            <button
              type="button"
              onClick={onOpenExcelImport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>导入 Excel</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新增固定开支项</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5">
          <div>
            <div className="text-xs text-slate-500">每月硬性开支基线（已启用）</div>
            <div className="mt-1.5 font-mono-num text-xl font-bold text-slate-900">
              {formatCurrency(monthlyBaseline)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">折合年度刚性开支预算</div>
            <div className="mt-1.5 font-mono-num text-xl font-bold text-slate-900">
              {formatCurrency(annualBaseline)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">模板条目数量</div>
            <div className="mt-1.5 font-mono-num text-xl font-bold text-slate-900">
              {activeTemplates.length} 项启用 / {templates.length} 项总计
            </div>
          </div>
        </div>
      </section>

      {/* Batch Generate Toolbar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="batch-month" className="text-xs font-medium text-slate-700">
            选择目标月份：
          </label>
          <input
            id="batch-month"
            type="month"
            value={targetMonth}
            onChange={(e) => {
              if (e.target.value) setTargetMonth(e.target.value);
            }}
            className="h-9 px-3 text-xs font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
          <button
            type="button"
            onClick={handleGenerateMonth}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>生成该月固定开支</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateYear}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <CopyCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>补齐 {selectedYear} 全年未登记月份</span>
          </button>
        </div>

        {feedback && (
          <div className="text-xs font-medium text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg">
            {feedback}
          </div>
        )}
      </section>

      {/* Templates Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {sortedTemplates.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">尚未建立每月固定开支模板</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              添加房贷、物业、学费、保险等固定月供项目，即可每月自动登记
            </p>
            <button
              type="button"
              onClick={onOpenAddTemplate}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
            >
              添加第一项固定开支
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-medium text-slate-500">
                  <th className="py-3 px-5">扣款日</th>
                  <th className="py-3 px-4">固定开支名称</th>
                  <th className="py-3 px-4">分类标签</th>
                  <th className="py-3 px-4">责任成员</th>
                  <th className="py-3 px-4">{selectedMonth} 登记状态</th>
                  <th className="py-3 px-4 text-right">每月金额</th>
                  <th className="py-3 px-4 text-center">模板状态</th>
                  <th className="py-3 px-5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sortedTemplates.map((tpl) => {
                  const tag = tagMap.get(tpl.categoryId);
                  const isSyncedThisMonth = existingTemplateIdsForMonth.has(tpl.id);
                  return (
                    <tr
                      key={tpl.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !tpl.active ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-5 font-mono-num text-slate-600 whitespace-nowrap">
                        每月 {tpl.dueDay} 日
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
                        <span
                          className={
                            isSyncedThisMonth ? 'text-teal-700 font-medium' : 'text-slate-400'
                          }
                        >
                          {isSyncedThisMonth ? '本月已入账单' : '本月未生成'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(tpl.amount)}
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
        )}
      </section>
    </div>
  );
};
