import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ASSET_CATEGORY_META, DEFAULT_MEMBERS } from '../data/seedData';
import { AccountDirection, AssetAccountItem, AssetCategory } from '../types/ledger';

interface AssetAccountModalProps {
  open: boolean;
  editingItem: AssetAccountItem | null;
  defaultMonthKey: string;
  defaultDirection?: AccountDirection;
  onClose: () => void;
  onSave: (data: Omit<AssetAccountItem, 'id' | 'updatedAt'>) => void;
}

export const AssetAccountModal: React.FC<AssetAccountModalProps> = ({
  open,
  editingItem,
  defaultMonthKey,
  defaultDirection = 'asset',
  onClose,
  onSave,
}) => {
  const [direction, setDirection] = useState<AccountDirection>('asset');
  const [category, setCategory] = useState<AssetCategory>('储蓄卡余额');
  const [monthKey, setMonthKey] = useState(defaultMonthKey);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [amount, setAmount] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [member, setMember] = useState(DEFAULT_MEMBERS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const scopedCategories = ASSET_CATEGORY_META.filter((m) => m.direction === direction);
  const memberOptions = DEFAULT_MEMBERS.includes(member)
    ? DEFAULT_MEMBERS
    : [...DEFAULT_MEMBERS, member];

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingItem) {
      setDirection(editingItem.direction);
      setCategory(editingItem.category);
      setMonthKey(editingItem.monthKey);
      setName(editingItem.name);
      setInstitution(editingItem.institution);
      setAmount(String(editingItem.amount));
      setCreditLimit(editingItem.creditLimit ? String(editingItem.creditLimit) : '');
      setMember(editingItem.member);
      setNotes(editingItem.notes || '');
    } else {
      setDirection(defaultDirection);
      const firstCat = ASSET_CATEGORY_META.find((m) => m.direction === defaultDirection);
      setCategory(firstCat?.category || '储蓄卡余额');
      setMonthKey(defaultMonthKey);
      setName('');
      setInstitution('');
      setAmount('');
      setCreditLimit('');
      setMember(DEFAULT_MEMBERS[0]);
      setNotes('');
    }
  }, [open, editingItem, defaultMonthKey, defaultDirection]);

  useEffect(() => {
    if (!open) return;
    const valid = scopedCategories.some((c) => c.category === category);
    if (!valid && scopedCategories.length > 0) {
      setCategory(scopedCategories[0].category);
    }
  }, [direction, scopedCategories, category, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!name.trim()) {
      setError('请填写账户或借贷名称');
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount < 0) {
      setError('请输入有效的金额（不能为负数）');
      return;
    }

    const numLimit = creditLimit.trim() ? Number(creditLimit) : undefined;
    if (numLimit !== undefined && (!Number.isFinite(numLimit) || numLimit < 0)) {
      setError('信用卡总额度格式不正确');
      return;
    }

    onSave({
      monthKey,
      direction,
      category,
      name: name.trim(),
      institution: institution.trim() || '未填写机构',
      amount: Math.round(numAmount * 100) / 100,
      creditLimit:
        category === '信用卡支出额度' && numLimit && numLimit > 0
          ? Math.round(numLimit * 100) / 100
          : undefined,
      member,
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
        aria-labelledby="asset-modal-title"
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 shrink-0">
          <h2 id="asset-modal-title" className="font-display text-base font-semibold text-slate-900">
            {editingItem ? '编辑月底资产借贷账户' : '登记月底货币资产或借贷账务'}
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
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">项目大类</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDirection('asset')}
                  className={`min-h-[40px] py-2 text-xs font-medium rounded-md transition-colors ${
                    direction === 'asset'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  货币资产（储蓄/货基/金/股）
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('liability')}
                  className={`min-h-[40px] py-2 text-xs font-medium rounded-md transition-colors ${
                    direction === 'liability'
                      ? 'bg-white text-red-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  借贷与信用卡支出额度
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="asset-month" className="block text-xs font-medium text-slate-600 mb-1.5">
                  盘点月份
                </label>
                <input
                  id="asset-month"
                  type="month"
                  value={monthKey}
                  onChange={(e) => {
                    if (e.target.value) setMonthKey(e.target.value);
                  }}
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label htmlFor="asset-category" className="block text-xs font-medium text-slate-600 mb-1.5">
                  细分类型
                </label>
                <select
                  id="asset-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AssetCategory)}
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                >
                  {scopedCategories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="asset-name" className="block text-xs font-medium text-slate-600 mb-1.5">
                  账户 / 账务名称
                </label>
                <input
                  id="asset-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    direction === 'asset'
                      ? '如：招行储蓄卡、余额宝、华泰证券'
                      : '如：招行信用卡账单、车贷分期余额'
                  }
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label htmlFor="asset-inst" className="block text-xs font-medium text-slate-600 mb-1.5">
                  所属银行 / 平台机构
                </label>
                <input
                  id="asset-inst"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="如：招商银行、支付宝、华泰证券"
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="asset-amount" className="block text-xs font-medium text-slate-600 mb-1.5">
                  {direction === 'asset'
                    ? '月底账户余额 / 市值（元）'
                    : category === '信用卡支出额度'
                      ? '信用卡已用待还额度（元）'
                      : '期末借贷待还余额（元）'}
                </label>
                <input
                  id="asset-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>

              {category === '信用卡支出额度' && (
                <div>
                  <label htmlFor="asset-limit" className="block text-xs font-medium text-slate-600 mb-1.5">
                    信用卡授信总额度（元，可选）
                  </label>
                  <input
                    id="asset-limit"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="如：50000"
                    className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm font-mono-num bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                归属成员（按先生、太太、父母、共同账户排序）
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
              <label htmlFor="asset-notes" className="block text-xs font-medium text-slate-600 mb-1.5">
                备注说明（可选）
              </label>
              <input
                id="asset-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="如：活期/定存到期日、账单日、还款日等"
                className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

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
              {editingItem ? '保存修改' : '确认登记'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
