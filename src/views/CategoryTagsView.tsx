import React, { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { TAG_COLOR_PALETTE } from '../data/seedData';
import { CategoryTag, EntryType, LedgerEntry } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';

interface CategoryTagsViewProps {
  tags: CategoryTag[];
  scopedEntries: LedgerEntry[];
  allEntries: LedgerEntry[];
  periodLabel: string;
  onCreateTag: (name: string, type: EntryType, color: string) => void;
  onUpdateTag: (id: string, name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
}

export const CategoryTagsView: React.FC<CategoryTagsViewProps> = ({
  tags,
  scopedEntries,
  allEntries,
  periodLabel,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<EntryType>('fixed_expense');
  const [color, setColor] = useState(TAG_COLOR_PALETTE[0].value);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const statsMap = useMemo(() => {
    const map = new Map<string, { periodTotal: number; periodCount: number; allCount: number }>();
    for (const e of allEntries) {
      const cur = map.get(e.categoryId) || { periodTotal: 0, periodCount: 0, allCount: 0 };
      cur.allCount += 1;
      map.set(e.categoryId, cur);
    }
    for (const e of scopedEntries) {
      const cur = map.get(e.categoryId) || { periodTotal: 0, periodCount: 0, allCount: 0 };
      cur.periodTotal += e.amount;
      cur.periodCount += 1;
      map.set(e.categoryId, cur);
    }
    return map;
  }, [scopedEntries, allEntries]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入标签名称');
      return;
    }
    if (tags.some((t) => t.type === type && t.name === trimmed)) {
      setError('该类型下已存在同名分类标签');
      return;
    }
    onCreateTag(trimmed, type, color);
    setName('');
    setError('');
  };

  const startEdit = (tag: CategoryTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const commitEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateTag(id, editName.trim(), editColor);
    setEditingId(null);
  };

  const renderGroup = (groupType: EntryType, title: string, subtitle: string) => {
    const list = tags.filter((t) => t.type === groupType);
    return (
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <span className="font-mono-num text-xs text-slate-500">{list.length} 个标签</span>
        </div>

        <div className="divide-y divide-slate-100">
          {list.map((tag) => {
            const stat = statsMap.get(tag.id) || {
              periodTotal: 0,
              periodCount: 0,
              allCount: 0,
            };
            const isEditing = editingId === tag.id;
            const canDelete = list.length > 1;

            return (
              <div
                key={tag.id}
                className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-teal-600"
                    />
                    <div className="flex items-center gap-1.5">
                      {TAG_COLOR_PALETTE.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditColor(c.value)}
                          className={`w-4 h-4 rounded-sm ${
                            editColor === c.value ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                          }`}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.label}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => commitEdit(tag.id)}
                        className="p-1.5 text-teal-700 hover:bg-teal-50 rounded"
                        aria-label="保存标签"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                        aria-label="取消编辑"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium text-slate-900">{tag.name}</span>
                    <span className="text-xs text-slate-400">
                      {tag.isDefault ? '系统预设' : '自定义'}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="font-mono-num text-xs font-semibold text-slate-900">
                      {formatCurrency(stat.periodTotal)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {periodLabel} {stat.periodCount} 笔 · 累计 {stat.allCount} 笔
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(tag)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                        aria-label="编辑分类标签"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!canDelete}
                        onClick={() => onDeleteTag(tag.id)}
                        title={
                          canDelete
                            ? '删除标签（关联账目将归入同类默认标签）'
                            : '同类至少保留一个标签'
                        }
                        className={`p-1.5 rounded ${
                          canDelete
                            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-slate-200 cursor-not-allowed'
                        }`}
                        aria-label="删除分类标签"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      {/* Create Custom Tag Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-display text-base font-semibold text-slate-900">新建分类标签</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          自定义家庭收入或硬性支出分类标签，用于报表归类、账目筛选及图表结构统计。
        </p>

        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-44">
            <label htmlFor="tag-type" className="block text-xs font-medium text-slate-600 mb-1.5">
              所属收支类型
            </label>
            <select
              id="tag-type"
              value={type}
              onChange={(e) => setType(e.target.value as EntryType)}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            >
              <option value="fixed_expense">硬性固定支出</option>
              <option value="income">家庭收入</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label htmlFor="tag-name" className="block text-xs font-medium text-slate-600 mb-1.5">
              标签名称
            </label>
            <input
              id="tag-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：宠物医疗、家政保洁、股权激励"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-600 mb-2">标识色彩</span>
            <div className="flex items-center gap-2 h-8">
              {TAG_COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-5 h-5 rounded-md transition-transform ${
                    color === c.value ? 'scale-110 ring-2 ring-offset-1 ring-slate-900' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 h-10 px-5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>添加标签</span>
          </button>
        </form>
        {error && <p className="text-xs font-medium text-red-600 mt-2">{error}</p>}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {renderGroup('fixed_expense', '硬性固定支出标签', '房贷、物业水电、教育、保险、车贷等刚性项目分类')}
        {renderGroup('income', '家庭收入标签', '工资薪金、奖金、副业、理财、租金等收入来源分类')}
      </div>
    </div>
  );
};
