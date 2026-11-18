import { useEffect, useMemo, useState } from 'react';
import { AssetAccountModal } from './components/AssetAccountModal';
import { EntryModal } from './components/EntryModal';
import { ExcelImportModal } from './components/ExcelImportModal';
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
} from './utils/analytics';
import { exportFullWorkbookToExcel, ParsedExcelResult } from './utils/excel';
import { getPreviousMonthKey } from './utils/formatters';
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

export function App() {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.entries);
      if (raw) return JSON.parse(raw) as LedgerEntry[];
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [templates, setTemplates] = useState<FixedExpenseTemplate[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.templates);
      if (raw) return JSON.parse(raw) as FixedExpenseTemplate[];
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [tags, setTags] = useState<CategoryTag[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.tags);
      if (raw) return JSON.parse(raw) as CategoryTag[];
    } catch {
      // ignore storage errors
    }
    return DEFAULT_TAGS;
  });

  const [assetAccounts, setAssetAccounts] = useState<AssetAccountItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.assets);
      if (raw) return JSON.parse(raw) as AssetAccountItem[];
    } catch {
      // ignore storage errors
    }
    return [];
  });

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

  const availableYears = useMemo(() => {
    const set = new Set<string>(['2025', '2026', '2027']);
    for (const e of entries) {
      set.add(e.date.slice(0, 4));
    }
    for (const a of assetAccounts) {
      set.add(a.monthKey.slice(0, 4));
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

  const hasPrevMonthAssetData = useMemo(() => {
    const prevKey = getPreviousMonthKey(selectedMonth);
    return assetAccounts.some((a) => a.monthKey === prevKey);
  }, [assetAccounts, selectedMonth]);

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
  const handleSaveAssetAccount = (data: Omit<AssetAccountItem, 'id' | 'updatedAt'>) => {
    if (editingAsset) {
      setAssetAccounts((prev) =>
        prev.map((a) =>
          a.id === editingAsset.id
            ? { ...a, ...data, updatedAt: new Date().toISOString() }
            : a
        )
      );
      setEditingAsset(null);
      return;
    }

    const newItem: AssetAccountItem = {
      ...data,
      id: createId('asset'),
      updatedAt: new Date().toISOString(),
    };
    setAssetAccounts((prev) => [newItem, ...prev]);
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

  const handleCopyAssetsFromPrevMonth = (monthKey: string): number => {
    const prevKey = getPreviousMonthKey(monthKey);
    const prevItems = assetAccounts.filter((a) => a.monthKey === prevKey);
    if (prevItems.length === 0) return 0;

    const existingNames = new Set(
      assetAccounts
        .filter((a) => a.monthKey === monthKey)
        .map((a) => `${a.direction}::${a.name}`)
    );

    const toAdd: AssetAccountItem[] = [];
    for (const item of prevItems) {
      const sig = `${item.direction}::${item.name}`;
      if (existingNames.has(sig)) continue;
      toAdd.push({
        ...item,
        id: createId('asset'),
        monthKey,
        updatedAt: new Date().toISOString(),
      });
    }

    if (toAdd.length > 0) {
      setAssetAccounts((prev) => [...toAdd, ...prev]);
    }
    return toAdd.length;
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
      setAssetAccounts((prev) =>
        mode === 'replace' ? parsed.assetAccounts : [...parsed.assetAccounts, ...prev]
      );
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

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1360px] w-full mx-auto">
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
              hasPrevMonthData={hasPrevMonthAssetData}
              onCopyFromPrevMonth={handleCopyAssetsFromPrevMonth}
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
    </div>
  );
}

export default App;
