import { useEffect, useMemo, useState } from 'react';
import { AssetAccountModal } from './components/AssetAccountModal';
import { EntryModal } from './components/EntryModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Sidebar } from './components/Sidebar';
import { TemplateModal } from './components/TemplateModal';
import { TopBar } from './components/TopBar';
import {
  DEFAULT_TAGS,
  DEFAULT_TEMPLATES,
  generateSeedAssetAccounts,
  generateSeedEntries,
} from './data/seedData';
import {
  AccountDirection,
  AssetAccountItem,
  CategoryTag,
  EntryType,
  FixedExpenseTemplate,
  LedgerEntry,
  NavSection,
  PeriodMode,
  SummaryReport,
} from './types/ledger';
import {
  computeAnnualTrend,
  computeAssetAnnualTrend,
  computeAssetSnapshotSummary,
  computeSummaryReport,
  filterEntriesByPeriod,
  findNearestCopyableMonth,
  resolveCreditLimitForCard,
} from './utils/analytics';
import { exportFullWorkbookToExcel, ParsedExcelResult } from './utils/excel';
import { AnalyticsExportView } from './views/AnalyticsExportView';
import { AssetsLiabilitiesView } from './views/AssetsLiabilitiesView';
import { CategoryTagsView } from './views/CategoryTagsView';
import { FixedTemplatesView } from './views/FixedTemplatesView';
import { OverviewView } from './views/OverviewView';
import { ReportLedgerView } from './views/ReportLedgerView';

const STORAGE_KEYS = {
  entries: 'household_ledger_entries_v2',
  templates: 'household_ledger_templates_v2',
  tags: 'household_ledger_tags_v2',
  assets: 'household_ledger_assets_v2',
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function clampDateForMonth(monthKey: string, dueDay: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const maxDay = new Date(Number(yStr), Number(mStr), 0).getDate();
  const safeDay = String(Math.min(dueDay, maxDay)).padStart(2, '0');
  return `${monthKey}-${safeDay}`;
}

function safeReadArray(key: string): unknown[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadStoredEntries(): LedgerEntry[] {
  const arr = safeReadArray(STORAGE_KEYS.entries);
  if (!arr) return [];
  return arr
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: typeof item.id === 'string' && item.id ? item.id : createId('entry'),
      title: typeof item.title === 'string' ? item.title : '未命名项目',
      amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
      type: item.type === 'income' ? ('income' as const) : ('fixed_expense' as const),
      categoryId: typeof item.categoryId === 'string' ? item.categoryId : '',
      date:
        typeof item.date === 'string' && /^\d{4}-\d{2}/.test(item.date)
          ? item.date
          : new Date().toISOString().slice(0, 10),
      member: typeof item.member === 'string' && item.member ? item.member : '先生',
      status: item.status === 'pending' ? ('pending' as const) : ('paid' as const),
      templateId: typeof item.templateId === 'string' ? item.templateId : undefined,
      notes: typeof item.notes === 'string' ? item.notes : undefined,
      createdAt:
        typeof item.createdAt === 'string' && item.createdAt
          ? item.createdAt
          : new Date().toISOString(),
    }));
}

function loadStoredTemplates(): FixedExpenseTemplate[] {
  const arr = safeReadArray(STORAGE_KEYS.templates);
  if (!arr) return [];
  return arr
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: typeof item.id === 'string' && item.id ? item.id : createId('tpl'),
      title: typeof item.title === 'string' ? item.title : '固定开支项',
      amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
      categoryId: typeof item.categoryId === 'string' ? item.categoryId : '',
      dueDay:
        Number.isFinite(Number(item.dueDay)) && Number(item.dueDay) >= 1 && Number(item.dueDay) <= 31
          ? Math.round(Number(item.dueDay))
          : 10,
      member: typeof item.member === 'string' && item.member ? item.member : '先生',
      active: typeof item.active === 'boolean' ? item.active : true,
      notes: typeof item.notes === 'string' ? item.notes : undefined,
    }));
}

function loadStoredTags(): CategoryTag[] {
  const arr = safeReadArray(STORAGE_KEYS.tags);
  if (!arr || arr.length === 0) return DEFAULT_TAGS;
  const sanitized = arr
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: typeof item.id === 'string' && item.id ? item.id : createId('tag'),
      name: typeof item.name === 'string' && item.name ? item.name : '未命名标签',
      type: item.type === 'income' ? ('income' as const) : ('fixed_expense' as const),
      color: typeof item.color === 'string' && item.color ? item.color : '#64748B',
      isDefault: Boolean(item.isDefault),
    }));
  return sanitized.length > 0 ? sanitized : DEFAULT_TAGS;
}

function loadStoredAssets(): AssetAccountItem[] {
  const arr = safeReadArray(STORAGE_KEYS.assets);
  if (!arr) return [];
  const fallbackMonth = new Date().toISOString().slice(0, 7);
  return arr
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const direction: AccountDirection = item.direction === 'liability' ? 'liability' : 'asset';
      const rawLimit = Number(item.creditLimit);
      return {
        id: typeof item.id === 'string' && item.id ? item.id : createId('asset'),
        monthKey:
          typeof item.monthKey === 'string' && /^\d{4}-\d{2}$/.test(item.monthKey)
            ? item.monthKey
            : fallbackMonth,
        direction,
        category: (typeof item.category === 'string' && item.category
          ? item.category
          : direction === 'asset'
            ? '储蓄卡余额'
            : '信用卡支出额度') as AssetAccountItem['category'],
        name: typeof item.name === 'string' ? item.name : '未命名账户',
        institution:
          typeof item.institution === 'string' && item.institution
            ? item.institution
            : '未填写机构',
        amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
        creditLimit: Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : undefined,
        member: typeof item.member === 'string' && item.member ? item.member : '先生',
        notes: typeof item.notes === 'string' ? item.notes : undefined,
        updatedAt:
          typeof item.updatedAt === 'string' && item.updatedAt
            ? item.updatedAt
            : new Date().toISOString(),
      };
    });
}

export function App() {
  const [entries, setEntries] = useState<LedgerEntry[]>(loadStoredEntries);
  const [templates, setTemplates] = useState<FixedExpenseTemplate[]>(loadStoredTemplates);
  const [tags, setTags] = useState<CategoryTag[]>(loadStoredTags);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccountItem[]>(loadStoredAssets);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, [entries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(templates));
    } catch {
      // ignore
    }
  }, [templates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(tags));
    } catch {
      // ignore
    }
  }, [tags]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(assetAccounts));
    } catch {
      // ignore
    }
  }, [assetAccounts]);

  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [selectedYear, setSelectedYear] = useState<string>(() =>
    new Date().toISOString().slice(0, 4)
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Modals
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FixedExpenseTemplate | null>(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetAccountItem | null>(null);
  const [defaultAssetDirection, setDefaultAssetDirection] = useState<AccountDirection>('asset');
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [lastCopyUndo, setLastCopyUndo] = useState<{
    monthKey: string;
    sourceMonth: string;
    createdIds: string[];
  } | null>(null);

  const availableYears = useMemo(() => {
    const set = new Set<string>(['2025', '2026', '2027']);
    for (const e of entries) {
      if (typeof e.date === 'string' && e.date.length >= 4) {
        set.add(e.date.slice(0, 4));
      }
    }
    for (const a of assetAccounts) {
      if (typeof a.monthKey === 'string' && a.monthKey.length >= 4) {
        set.add(a.monthKey.slice(0, 4));
      }
    }
    set.add(selectedYear);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries, assetAccounts, selectedYear]);

  const handleChangeMonth = (m: string) => {
    setSelectedMonth(m);
    setSelectedYear(m.slice(0, 4));
  };

  const scopedEntries = useMemo(
    () => filterEntriesByPeriod(entries, periodMode, selectedMonth, selectedYear),
    [entries, periodMode, selectedMonth, selectedYear]
  );

  const report = useMemo(
    () => computeSummaryReport(entries, tags, periodMode, selectedMonth, selectedYear),
    [entries, tags, periodMode, selectedMonth, selectedYear]
  );

  const annualTrend = useMemo(
    () => computeAnnualTrend(entries, selectedYear),
    [entries, selectedYear]
  );

  // Asset & Credit/Loan memoized calculations
  const monthAssets = useMemo(
    () => assetAccounts.filter((a) => a.monthKey === selectedMonth),
    [assetAccounts, selectedMonth]
  );

  const periodAssetsForExport = useMemo(() => {
    const prefix = periodMode === 'month' ? selectedMonth : `${selectedYear}-`;
    return assetAccounts.filter((a) => a.monthKey.startsWith(prefix));
  }, [assetAccounts, periodMode, selectedMonth, selectedYear]);

  const assetSummary = useMemo(
    () => computeAssetSnapshotSummary(assetAccounts, selectedMonth),
    [assetAccounts, selectedMonth]
  );

  const assetAnnualTrend = useMemo(
    () => computeAssetAnnualTrend(assetAccounts, selectedYear),
    [assetAccounts, selectedYear]
  );

  const copySourceMonth = useMemo(
    () => findNearestCopyableMonth(assetAccounts, selectedMonth),
    [assetAccounts, selectedMonth]
  );

  const activeTemplates = useMemo(() => templates.filter((t) => t.active), [templates]);
  const monthlyTemplateBaseline = useMemo(
    () => activeTemplates.reduce((acc, t) => acc + t.amount, 0),
    [activeTemplates]
  );

  const existingTemplateIdsForMonth = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.date.startsWith(selectedMonth) && e.templateId) {
        ids.add(e.templateId);
      }
    }
    return ids;
  }, [entries, selectedMonth]);

  const missingTemplatesForMonth = useMemo(
    () => activeTemplates.filter((t) => !existingTemplateIdsForMonth.has(t.id)),
    [activeTemplates, existingTemplateIdsForMonth]
  );

  // Handlers
  const handleQuickCreateTag = (name: string, type: EntryType, color: string): CategoryTag => {
    const existing = tags.find((t) => t.type === type && t.name === name);
    if (existing) return existing;
    const newTag: CategoryTag = {
      id: createId('tag'),
      name,
      type,
      color,
      isDefault: false,
    };
    setTags((prev) => [...prev, newTag]);
    return newTag;
  };

  const handleUpdateTag = (id: string, name: string, color: string) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name, color } : t)));
  };

  const handleDeleteTag = (id: string) => {
    const target = tags.find((t) => t.id === id);
    if (!target) return;
    const sameType = tags.filter((t) => t.type === target.type && t.id !== id);
    if (sameType.length === 0) return;
    const fallbackId = sameType[0].id;

    setEntries((prev) =>
      prev.map((e) => (e.categoryId === id ? { ...e, categoryId: fallbackId } : e))
    );
    setTemplates((prev) =>
      prev.map((tpl) => (tpl.categoryId === id ? { ...tpl, categoryId: fallbackId } : tpl))
    );
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveEntry = (
    data: Omit<LedgerEntry, 'id' | 'createdAt'>,
    alsoSaveTemplate: boolean
  ) => {
    if (editingEntry) {
      setEntries((prev) =>
        prev.map((e) => (e.id === editingEntry.id ? { ...e, ...data } : e))
      );
      setEditingEntry(null);
      return;
    }

    let templateId: string | undefined;
    if (alsoSaveTemplate && data.type === 'fixed_expense') {
      const dueDay = Number(data.date.slice(8, 10)) || 10;
      const newTpl: FixedExpenseTemplate = {
        id: createId('tpl'),
        title: data.title,
        amount: data.amount,
        categoryId: data.categoryId,
        dueDay,
        member: data.member,
        active: true,
        notes: data.notes,
      };
      templateId = newTpl.id;
      setTemplates((prev) => [...prev, newTpl]);
    }

    const newEntry: LedgerEntry = {
      ...data,
      id: createId('entry'),
      templateId,
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [newEntry, ...prev]);
  };

  const handleToggleEntryStatus = (id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: e.status === 'paid' ? 'pending' : 'paid' } : e
      )
    );
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSaveTemplate = (data: Omit<FixedExpenseTemplate, 'id'>) => {
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...data } : t))
      );
      setEditingTemplate(null);
      return;
    }
    const newTpl: FixedExpenseTemplate = {
      ...data,
      id: createId('tpl'),
    };
    setTemplates((prev) => [...prev, newTpl]);
  };

  const handleToggleTemplateActive = (id: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t)));
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const generateTemplatesForMonth = (monthKey: string): number => {
    const existingForMonth = new Set(
      entries
        .filter((e) => e.date.startsWith(monthKey) && e.templateId)
        .map((e) => e.templateId as string)
    );

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const toAdd: LedgerEntry[] = [];
    for (const tpl of activeTemplates) {
      if (existingForMonth.has(tpl.id)) continue;
      const dateStr = clampDateForMonth(monthKey, tpl.dueDay);
      toAdd.push({
        id: createId('entry'),
        title: tpl.title,
        amount: tpl.amount,
        type: 'fixed_expense',
        categoryId: tpl.categoryId,
        date: dateStr,
        member: tpl.member,
        status: monthKey < currentMonthKey ? 'paid' : 'pending',
        templateId: tpl.id,
        notes: tpl.notes,
        createdAt: new Date().toISOString(),
      });
    }

    if (toAdd.length > 0) {
      setEntries((prev) => [...toAdd, ...prev]);
    }
    return toAdd.length;
  };

  const generateTemplatesForYear = (yearKey: string): number => {
    const existingPairs = new Set(
      entries
        .filter((e) => e.date.startsWith(`${yearKey}-`) && e.templateId)
        .map((e) => `${e.date.slice(0, 7)}::${e.templateId}`)
    );

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const toAdd: LedgerEntry[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${yearKey}-${String(m).padStart(2, '0')}`;
      for (const tpl of activeTemplates) {
        const pair = `${monthKey}::${tpl.id}`;
        if (existingPairs.has(pair)) continue;
        toAdd.push({
          id: createId('entry'),
          title: tpl.title,
          amount: tpl.amount,
          type: 'fixed_expense',
          categoryId: tpl.categoryId,
          date: clampDateForMonth(monthKey, tpl.dueDay),
          member: tpl.member,
          status: monthKey < currentMonthKey ? 'paid' : 'pending',
          templateId: tpl.id,
          notes: tpl.notes,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (toAdd.length > 0) {
      setEntries((prev) => [...toAdd, ...prev]);
    }
    return toAdd.length;
  };

  // Asset & Credit/Loan Handlers
  const handleSaveAssetAccount = (
    data: Omit<AssetAccountItem, 'id' | 'updatedAt'>,
    options?: { syncCreditLimitToAllMonths?: boolean }
  ) => {
    const cleanName = (data.name || '').trim().toLowerCase();
    const cleanInst = (data.institution || '').trim().toLowerCase();
    const cleanMember = (data.member || '先生').trim();
    const isSameCard = (item: AssetAccountItem) => {
      if (item.category !== '信用卡支出额度') return false;
      if ((item.member || '先生').trim() !== cleanMember) return false;
      const iName = (item.name || '').trim().toLowerCase();
      const iInst = (item.institution || '').trim().toLowerCase();
      return cleanInst ? iName === cleanName && iInst === cleanInst : iName === cleanName;
    };

    // If creating a credit card without a limit, try inheriting from earlier/later months for the same member automatically
    let resolvedCreditLimit = data.creditLimit;
    if (!editingAsset && data.category === '信用卡支出额度' && !resolvedCreditLimit) {
      const inherited = resolveCreditLimitForCard(
        assetAccounts,
        data.monthKey,
        data.name,
        data.institution,
        data.member
      );
      if (inherited) {
        resolvedCreditLimit = inherited.creditLimit;
      }
    }

    const payload: Omit<AssetAccountItem, 'id' | 'updatedAt'> = {
      ...data,
      creditLimit: resolvedCreditLimit,
    };

    const propagateLimit = (list: AssetAccountItem[], targetId?: string): AssetAccountItem[] => {
      if (payload.category !== '信用卡支出额度' || !payload.creditLimit) {
        return list;
      }
      const nextLimit = payload.creditLimit;
      const syncAll = Boolean(options?.syncCreditLimitToAllMonths);
      return list.map((item) => {
        if (targetId && item.id === targetId) return item;
        if (item.monthKey === payload.monthKey) return item;
        if (!isSameCard(item)) return item;
        // Always backfill empty limits across earlier/later months; overwrite all if syncAll is enabled
        if (syncAll || !item.creditLimit) {
          return {
            ...item,
            creditLimit: nextLimit,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });
    };

    if (editingAsset) {
      setAssetAccounts((prev) => {
        const updated = prev.map((a) =>
          a.id === editingAsset.id
            ? { ...a, ...payload, updatedAt: new Date().toISOString() }
            : a
        );
        return propagateLimit(updated, editingAsset.id);
      });
      setEditingAsset(null);
      return;
    }

    const newItem: AssetAccountItem = {
      ...payload,
      id: createId('asset'),
      updatedAt: new Date().toISOString(),
    };
    setAssetAccounts((prev) => propagateLimit([newItem, ...prev], newItem.id));
  };

  const handleQuickUpdateAssetAmount = (id: string, newAmount: number) => {
    setAssetAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, amount: newAmount, updatedAt: new Date().toISOString() } : a
      )
    );
  };

  const handleDeleteAssetAccount = (id: string) => {
    setAssetAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCopyAssetsFromAdjacentMonth = (
    monthKey: string,
    explicitSourceMonth?: string
  ): number => {
    const sourceMonth =
      explicitSourceMonth || findNearestCopyableMonth(assetAccounts, monthKey);
    if (!sourceMonth) return 0;

    const sourceItems = assetAccounts.filter((a) => a.monthKey === sourceMonth);
    if (sourceItems.length === 0) return 0;

    const getSig = (a: AssetAccountItem) =>
      `${a.direction}::${(a.member || '先生').trim()}::${(a.institution || '').trim()}::${(a.name || '').trim()}`;

    const existingNames = new Set(
      assetAccounts.filter((a) => a.monthKey === monthKey).map(getSig)
    );

    const toAdd: AssetAccountItem[] = [];
    for (const item of sourceItems) {
      const sig = getSig(item);
      if (existingNames.has(sig)) continue;
      let creditLimit = item.creditLimit;
      if (item.category === '信用卡支出额度' && !creditLimit) {
        const resolved = resolveCreditLimitForCard(
          assetAccounts,
          monthKey,
          item.name,
          item.institution,
          item.member
        );
        if (resolved) creditLimit = resolved.creditLimit;
      }
      toAdd.push({
        ...item,
        id: createId('asset'),
        monthKey,
        creditLimit,
        updatedAt: new Date().toISOString(),
      });
    }

    if (toAdd.length > 0) {
      setAssetAccounts((prev) => [...toAdd, ...prev]);
      setLastCopyUndo({
        monthKey,
        sourceMonth,
        createdIds: toAdd.map((item) => item.id),
      });
    }
    return toAdd.length;
  };

  const handleUndoCopyAssets = (): number => {
    if (!lastCopyUndo) return 0;
    const idSet = new Set(lastCopyUndo.createdIds);
    const removedCount = assetAccounts.filter((a) => idSet.has(a.id)).length;
    setAssetAccounts((prev) => prev.filter((a) => !idSet.has(a.id)));
    setLastCopyUndo(null);
    return removedCount;
  };

  // Excel Export & Import Handlers
  const handleExportWorkbook = (
    customReport?: SummaryReport,
    customEntries?: LedgerEntry[]
  ) => {
    const rep = customReport || report;
    const ents = customEntries || scopedEntries;
    exportFullWorkbookToExcel({
      filename: `家计账本_${rep.periodLabel.replace(/\s+/g, '')}.xlsx`,
      report: rep,
      entries: ents,
      templates,
      assetAccounts: periodAssetsForExport,
      tags,
    });
  };

  const handleConfirmExcelImport = (
    parsed: ParsedExcelResult,
    mode: 'merge' | 'replace'
  ) => {
    if (parsed.newTags.length > 0) {
      setTags((prev) => [...prev, ...parsed.newTags]);
    }

    if (parsed.entries.length > 0) {
      setEntries((prev) =>
        mode === 'replace' ? parsed.entries : [...parsed.entries, ...prev]
      );
    }

    if (parsed.templates.length > 0) {
      setTemplates((prev) =>
        mode === 'replace' ? parsed.templates : [...parsed.templates, ...prev]
      );
    }

    if (parsed.assetAccounts.length > 0) {
      setAssetAccounts((prev) => {
        const combined =
          mode === 'replace' ? parsed.assetAccounts : [...parsed.assetAccounts, ...prev];
        // Ensure credit card limits inherit across all imported + existing months
        return combined.map((item) => {
          if (item.category === '信用卡支出额度' && !item.creditLimit) {
            const resolved = resolveCreditLimitForCard(
              combined,
              item.monthKey,
              item.name,
              item.institution,
              item.member
            );
            if (resolved) {
              return { ...item, creditLimit: resolved.creditLimit };
            }
          }
          return item;
        });
      });
    }
  };

  const handleResetDemoData = () => {
    setTags(DEFAULT_TAGS);
    setTemplates(DEFAULT_TEMPLATES);
    setEntries(generateSeedEntries());
    setAssetAccounts(generateSeedAssetAccounts());
    setSelectedMonth('2026-11');
    setSelectedYear('2026');
  };

  const handleClearAllData = () => {
    setEntries([]);
    setTemplates([]);
    setAssetAccounts([]);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        monthlyTemplateBaseline={monthlyTemplateBaseline}
        activeTemplateCount={activeTemplates.length}
        latestNetAssets={assetSummary.netMonetaryAssets}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onExportFullExcel={() => handleExportWorkbook()}
        onOpenExcelImport={() => setExcelImportOpen(true)}
        onResetDemoData={handleResetDemoData}
        onClearAllData={handleClearAllData}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeNav={activeNav}
          periodMode={periodMode}
          onChangePeriodMode={setPeriodMode}
          selectedMonth={selectedMonth}
          onChangeMonth={handleChangeMonth}
          selectedYear={selectedYear}
          onChangeYear={setSelectedYear}
          availableYears={availableYears}
          onOpenAddEntry={() => {
            setEditingEntry(null);
            setEntryModalOpen(true);
          }}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6 pb-20 lg:pb-8 max-w-[1360px] w-full mx-auto">
          {activeNav === 'overview' && (
            <OverviewView
              periodMode={periodMode}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              report={report}
              assetSummary={assetSummary}
              annualTrend={annualTrend}
              scopedEntries={scopedEntries}
              tags={tags}
              missingTemplatesForMonth={missingTemplatesForMonth}
              onGenerateMonthTemplates={generateTemplatesForMonth}
              onToggleEntryStatus={handleToggleEntryStatus}
              onEditEntry={(entry) => {
                setEditingEntry(entry);
                setEntryModalOpen(true);
              }}
              onOpenAddEntry={() => {
                setEditingEntry(null);
                setEntryModalOpen(true);
              }}
              onNavigateReports={() => setActiveNav('reports')}
              onNavigateAssets={() => setActiveNav('assets')}
              onSelectMonth={(mKey) => {
                handleChangeMonth(mKey);
                setPeriodMode('month');
              }}
            />
          )}

          {activeNav === 'templates' && (
            <FixedTemplatesView
              templates={templates}
              tags={tags}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              existingTemplateIdsForMonth={existingTemplateIdsForMonth}
              onOpenAddTemplate={() => {
                setEditingTemplate(null);
                setTemplateModalOpen(true);
              }}
              onEditTemplate={(tpl) => {
                setEditingTemplate(tpl);
                setTemplateModalOpen(true);
              }}
              onToggleTemplateActive={handleToggleTemplateActive}
              onDeleteTemplate={handleDeleteTemplate}
              onGenerateForMonth={generateTemplatesForMonth}
              onGenerateForYear={generateTemplatesForYear}
              onExportExcel={() => handleExportWorkbook()}
              onOpenExcelImport={() => setExcelImportOpen(true)}
            />
          )}

          {activeNav === 'reports' && (
            <ReportLedgerView
              periodMode={periodMode}
              report={report}
              scopedEntries={scopedEntries}
              tags={tags}
              onToggleStatus={handleToggleEntryStatus}
              onEditEntry={(entry) => {
                setEditingEntry(entry);
                setEntryModalOpen(true);
              }}
              onDeleteEntry={handleDeleteEntry}
              onExportExcel={(filtered) => handleExportWorkbook(report, filtered)}
              onOpenExcelImport={() => setExcelImportOpen(true)}
            />
          )}

          {activeNav === 'assets' && (
            <AssetsLiabilitiesView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChangeMonth={handleChangeMonth}
              monthItems={monthAssets}
              allAssetItems={assetAccounts}
              summary={assetSummary}
              annualTrend={assetAnnualTrend}
              copySourceMonth={copySourceMonth}
              lastCopyUndo={lastCopyUndo}
              onCopyFromAdjacentMonth={handleCopyAssetsFromAdjacentMonth}
              onUndoCopyAssets={handleUndoCopyAssets}
              onOpenAddAccount={(direction) => {
                setEditingAsset(null);
                setDefaultAssetDirection(direction);
                setAssetModalOpen(true);
              }}
              onEditAccount={(item) => {
                setEditingAsset(item);
                setAssetModalOpen(true);
              }}
              onQuickUpdateAmount={handleQuickUpdateAssetAmount}
              onDeleteAccount={handleDeleteAssetAccount}
              onOpenExcelImport={() => setExcelImportOpen(true)}
            />
          )}

          {activeNav === 'analytics' && (
            <AnalyticsExportView
              allEntries={entries}
              allAssets={assetAccounts}
              tags={tags}
              periodMode={periodMode}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              availableYears={availableYears}
              onChangePeriodMode={setPeriodMode}
              onChangeMonth={handleChangeMonth}
              onChangeYear={setSelectedYear}
              onExportExcel={(rep, ents) => handleExportWorkbook(rep, ents)}
            />
          )}

          {activeNav === 'tags' && (
            <CategoryTagsView
              tags={tags}
              scopedEntries={scopedEntries}
              allEntries={entries}
              periodLabel={report.periodLabel}
              onCreateTag={(name, type, color) => handleQuickCreateTag(name, type, color)}
              onUpdateTag={handleUpdateTag}
              onDeleteTag={handleDeleteTag}
            />
          )}
        </main>
      </div>

      <EntryModal
        open={entryModalOpen}
        editingEntry={editingEntry}
        defaultMonth={selectedMonth}
        tags={tags}
        onClose={() => {
          setEntryModalOpen(false);
          setEditingEntry(null);
        }}
        onSaveEntry={handleSaveEntry}
        onQuickCreateTag={handleQuickCreateTag}
      />

      <TemplateModal
        open={templateModalOpen}
        editingTemplate={editingTemplate}
        expenseTags={tags.filter((t) => t.type === 'fixed_expense')}
        onClose={() => {
          setTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        onSaveTemplate={handleSaveTemplate}
      />

      <AssetAccountModal
        open={assetModalOpen}
        editingItem={editingAsset}
        defaultMonthKey={selectedMonth}
        defaultDirection={defaultAssetDirection}
        allAssetItems={assetAccounts}
        onClose={() => {
          setAssetModalOpen(false);
          setEditingAsset(null);
        }}
        onSave={handleSaveAssetAccount}
      />

      <ExcelImportModal
        open={excelImportOpen}
        tags={tags}
        onClose={() => setExcelImportOpen(false)}
        onConfirmImport={handleConfirmExcelImport}
      />

      <MobileBottomNav activeNav={activeNav} onSelectNav={setActiveNav} />
    </div>
  );
}

export default App;
