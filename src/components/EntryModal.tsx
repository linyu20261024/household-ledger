import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { DEFAULT_MEMBERS, TAG_COLOR_PALETTE } from '../data/seedData';
import { CategoryTag, EntryType, LedgerEntry, PaymentStatus } from '../types/ledger';

interface EntryModalProps {
  open: boolean;
  editingEntry: LedgerEntry | null;
  defaultMonth: string;
  tags: CategoryTag[];
  onClose: () => void;
  onSaveEntry: (
    data: Omit<LedgerEntry, 'id' | 'createdAt'>,
    alsoSaveTemplate: boolean
  ) => void;
  onQuickCreateTag: (name: string, type: EntryType, color: string) => CategoryTag;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  open,
  editingEntry,
  defaultMonth,
  tags,
  onClose,
  onSaveEntry,
  onQuickCreateTag,
}) => {
  const [type, setType] = useState<EntryType>('fixed_expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(`${defaultMonth}-18`);
  const [categoryId, setCategoryId] = useState('');
  const [member, setMember] = useState('家庭共同');
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [alsoSaveTemplate, setAlsoSaveTemplate] = useState(false);

  // Quick tag creation inline state
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLOR_PALETTE[0].value);
  const [error, setError] = useState('');

  const scopedTags = tags.filter((t) => t.type === type);

  useEffect(() => {
    if (!open) return;
    setError('');
    setAddingTag(false);
    setNewTagName('');

    if (editingEntry) {
      setType(editingEntry.type);
      setTitle(editingEntry.title);
      setAmount(String(editingEntry.amount));
      setDate(editingEntry.date);
      setCategoryId(editingEntry.categoryId);
      setMember(editingEntry.member);
      setStatus(editingEntry.status);
      setNotes(editingEntry.notes || '');
      setAlsoSaveTemplate(false);
    } else {
      setType('fixed_expense');
      setTitle('');
      setAmount('');
      const todayDay = String(new Date().getDate()).padStart(2, '0');
      setDate(`${defaultMonth}-${todayDay}`);
      const firstExp = tags.find((t) => t.type === 'fixed_expense');
      setCategoryId(firstExp?.id || '');
      setMember('家庭共同');
      setStatus('paid');
      setNotes('');
      setAlsoSaveTemplate(false);
    }
  }, [open, editingEntry, defaultMonth, tags]);

  // Ensure categoryId stays valid when switching entry type
  useEffect(() => {
    if (!open) return;
    const exists = scopedTags.some((t) => t.id === categoryId);
    if (!exists && scopedTags.length > 0) {
      setCategoryId(scopedTags[0].id);
    }
  }, [type, scopedTags, categoryId, open]);

  if (!open) return null;

  const handleQuickTagSubmit = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const created = onQuickCreateTag(trimmed, type, newTagColor);
    setCategoryId(created.id);
    setAddingTag(false);
    setNewTagName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!title.trim()) {
      setError('请填写项目名称');
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('请输入大于 0 的有效金额');
      return;
    }
    if (!date) {
      setError('请选择日期');
      return;
    }
    if (!categoryId) {
      setError('请选择分类标签');
      return;
    }

    onSaveEntry(
      {
        title: title.trim(),
        amount: Math.round(numAmount * 100) / 100,
        type,
        categoryId,
        date,
        member,
        status,
        templateId: editingEntry?.templateId,
        notes: notes.trim() || undefined,
      },
      !editingEntry && type === 'fixed_expense' && alsoSaveTemplate
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
      <div
        className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="entry-modal-title" className="font-display text-base font-semibold text-slate-900">
            {editingEntry ? '编辑收支记录' : '登记收支记录'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="关闭弹窗"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Switch */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">记录类型</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setType('fixed_expense')}
                className={`py-2 text-xs font-medium rounded-md transition-colors ${
                  type === 'fixed_expense'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                硬性固定支出
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-medium rounded-md transition-colors ${
                  type === 'income'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                家庭收入
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="entry-title" className="block text-xs font-medium text-slate-600 mb-1.5">
                项目名称
              </label>
              <input
                id="entry-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'income' ? '如：11月工资、季度奖金' : '如：房贷月供、物业费'}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label htmlFor="entry-amount" className="block text-xs font-medium text-slate-600 mb-1.5">
                金额（元）
              </label>
              <input
                id="entry-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3 text-sm font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="entry-date" className="block text-xs font-medium text-slate-600 mb-1.5">
                {type === 'income' ? '入账日期' : '扣款 / 发生日期'}
              </label>
              <input
                id="entry-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label htmlFor="entry-member" className="block text-xs font-medium text-slate-600 mb-1.5">
                归属成员
              </label>
              <select
                id="entry-member"
                value={member}
                onChange={(e) => setMember(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              >
                {DEFAULT_MEMBERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Tag + Quick Create */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="entry-category" className="text-xs font-medium text-slate-600">
                分类标签
              </label>
              <button
                type="button"
                onClick={() => setAddingTag(!addingTag)}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingTag ? '取消新建' : '新建标签'}</span>
              </button>
            </div>

            {addingTag ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="输入新分类标签名称"
                    className="flex-1 h-9 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-teal-600"
                  />
                  <button
                    type="button"
                    onClick={handleQuickTagSubmit}
                    className="px-3 h-9 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md whitespace-nowrap"
                  >
                    确认添加
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">颜色：</span>
                  {TAG_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewTagColor(c.value)}
                      className={`w-5 h-5 rounded-md border transition-transform ${
                        newTagColor === c.value
                          ? 'scale-110 ring-2 ring-offset-1 ring-slate-900 border-white'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                      aria-label={c.label}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <select
                id="entry-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              >
                {scopedTags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">结算状态</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatus('paid')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                    status === 'paid'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'income' ? '已入账' : '已扣款'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                    status === 'pending'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'income' ? '待入账' : '待扣款'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="entry-notes" className="block text-xs font-medium text-slate-600 mb-1.5">
                备注说明（可选）
              </label>
              <input
                id="entry-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="银行卡尾号、账单周期等"
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>
          </div>

          {/* Optional save as recurring fixed template */}
          {!editingEntry && type === 'fixed_expense' && (
            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={alsoSaveTemplate}
                onChange={(e) => setAlsoSaveTemplate(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span className="text-xs text-slate-600">
                同时将此项目加入「每月固定开支模板」，方便后续月份一键自动生成
              </span>
            </label>
          )}

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
            >
              {editingEntry ? '保存修改' : '确认登记'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
