import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { DEFAULT_MEMBERS } from '../data/seedData';
import {
  CategoryTag,
  FixedExpenseTemplate,
  TemplateAmountMode,
  TemplateFrequency,
} from '../types/ledger';

interface TemplateModalProps {
  open: boolean;
  editingTemplate: FixedExpenseTemplate | null;
  expenseTags: CategoryTag[];
  onClose: () => void;
  onSaveTemplate: (data: Omit<FixedExpenseTemplate, 'id'>) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  open,
  editingTemplate,
  expenseTags,
  onClose,
  onSaveTemplate,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [amountMode, setAmountMode] = useState<TemplateAmountMode>('fixed');
  const [frequency, setFrequency] = useState<TemplateFrequency>('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [member, setMember] = useState(DEFAULT_MEMBERS[0]);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const memberOptions = DEFAULT_MEMBERS.includes(member)
    ? DEFAULT_MEMBERS
    : [...DEFAULT_MEMBERS, member];

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingTemplate) {
      setTitle(editingTemplate.title);
      setAmount(String(editingTemplate.amount));
      setAmountMode(editingTemplate.amountMode ?? 'fixed');
      setFrequency(editingTemplate.frequency ?? 'monthly');
      setCategoryId(editingTemplate.categoryId);
      setDueDay(String(editingTemplate.dueDay));
      setMember(editingTemplate.member);
      setActive(editingTemplate.active);
      setNotes(editingTemplate.notes || '');
    } else {
      setTitle('');
      setAmount('');
      setAmountMode('fixed');
      setFrequency('monthly');
      setCategoryId(expenseTags[0]?.id || '');
      setDueDay('10');
      setMember(DEFAULT_MEMBERS[0]);
      setActive(true);
      setNotes('');
    }
  }, [open, editingTemplate, expenseTags]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = amount.trim() === '' && amountMode === 'variable' ? 0 : Number(amount);
    const numDay = Number(dueDay);
    if (!title.trim()) {
      setError('请填写固定开支名称');
      return;
    }
    if (amountMode === 'fixed') {
      if (!Number.isFinite(rawNum) || rawNum <= 0) {
        setError('请输入大于 0 的固定金额（如金额不固定，请切换为「金额不固定」）');
        return;
      }
    } else if (!Number.isFinite(rawNum) || rawNum < 0) {
      setError('请输入不小于 0 的参考金额');
      return;
    }
    if (!Number.isInteger(numDay) || numDay < 1 || numDay > 31) {
      setError('扣款日须为 1 至 31 之间的整数');
      return;
    }

    onSaveTemplate({
      title: title.trim(),
      amount: Math.round(rawNum * 100) / 100,
      amountMode,
      frequency,
      categoryId,
      dueDay: numDay,
      member,
      active,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/45 backdrop-blur-[1px]">
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-xl border border-slate-200 shadow-xl max-h-[92dvh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-modal-title"
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 shrink-0">
          <h2 id="tpl-modal-title" className="font-display text-base font-semibold text-slate-900">
            {editingTemplate ? '编辑固定开支模板' : '新增固定开支模板'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] -mr-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="关闭弹窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Frequency & Amount Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">发生频次</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFrequency('monthly')}
                    className={`min-h-[36px] px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      frequency === 'monthly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    每月固定
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('occasional')}
                    className={`min-h-[36px] px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      frequency === 'occasional'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    非每月都有
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">金额模式</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAmountMode('fixed')}
                    className={`min-h-[36px] px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      amountMode === 'fixed'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    固定金额
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountMode('variable')}
                    className={`min-h-[36px] px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      amountMode === 'variable'
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    金额不固定
                  </button>
                </div>
              </div>
            </div>

            {(frequency === 'occasional' || amountMode === 'variable') && (
              <div className="text-[11px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {frequency === 'occasional' && (
                  <p>·「非每月都有」不会计入每月固定基线，也不会在首页提醒未登记；需要记账的月份在模板列表点击「记入本月」即可。</p>
                )}
                {amountMode === 'variable' && (
                  <p>·「金额不固定」可填写预估参考金额或留空（默认 0 元），记入当月后可随时点击金额修改为实际账单金额。</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tpl-title" className="block text-xs font-medium text-slate-600 mb-1.5">
                  固定开支名称
                </label>
                <input
                  id="tpl-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="如：房贷按揭、水电燃气、季度物业"
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label htmlFor="tpl-amount" className="block text-xs font-medium text-slate-600 mb-1.5">
                  {amountMode === 'variable' ? '参考金额（元，可填 0）' : '每月标准金额（元）'}
                </label>
                <input
                  id="tpl-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={amountMode === 'variable' ? '0.00（入账时再填实付）' : '0.00'}
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tpl-category" className="block text-xs font-medium text-slate-600 mb-1.5">
                  分类标签
                </label>
                <select
                  id="tpl-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                >
                  {expenseTags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tpl-day" className="block text-xs font-medium text-slate-600 mb-1.5">
                  惯常扣款日（日）
                </label>
                <input
                  id="tpl-day"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                责任成员（按先生、太太、父母、共同账户排序）
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {memberOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMember(m)}
                    className={`min-h-[40px] px-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap truncate ${
                      member === m
                        ? 'bg-teal-50 border-teal-600 text-teal-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="tpl-notes" className="block text-xs font-medium text-slate-600 mb-1.5">
                说明备注（可选）
              </label>
              <input
                id="tpl-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="如：每两月抄表一次 / 绑定招商银行代扣"
                className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            <label className="flex items-center gap-3 py-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-5 h-5 sm:w-4 sm:h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 shrink-0"
              />
              <span className="text-xs text-slate-700">
                启用该模板
                {frequency === 'monthly'
                  ? '（纳入每月固定开支基线与一键生成列表）'
                  : '（保留在可用模板列表，按需记入具体月份）'}
              </span>
            </label>

            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white pb-safe shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 sm:bg-transparent hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
            >
              {editingTemplate ? '保存模板' : '创建模板'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
