import * as XLSX from 'xlsx';
import { ASSET_CATEGORY_META, DEFAULT_MEMBERS, TAG_COLOR_PALETTE } from '../data/seedData';
import {
  AccountDirection,
  AssetAccountItem,
  AssetCategory,
  CategoryTag,
  EntryType,
  FixedExpenseTemplate,
  LedgerEntry,
  SummaryReport,
} from '../types/ledger';
import { resolveCreditLimitForCard } from './analytics';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const VALID_ASSET_CATEGORIES = new Set<AssetCategory>(
  ASSET_CATEGORY_META.map((m) => m.category)
);

function normalizeAssetCategory(
  rawCat: string,
  direction: AccountDirection
): AssetCategory {
  const cleaned = rawCat.trim();
  if (VALID_ASSET_CATEGORIES.has(cleaned as AssetCategory)) {
    return cleaned as AssetCategory;
  }
  if (cleaned.includes('储蓄') || cleaned.includes('银行卡')) return '储蓄卡余额';
  if (cleaned.includes('货币基金') || cleaned.includes('余额宝') || cleaned.includes('零钱通'))
    return '货币基金';
  if (cleaned.includes('积存金') || cleaned.includes('黄金')) return '积存金';
  if (cleaned.includes('股票') || cleaned.includes('证券') || cleaned.includes('基金'))
    return '股票账户';
  if (cleaned.includes('信用卡')) return '信用卡支出额度';
  if (cleaned.includes('亲友') || cleaned.includes('私人')) return '私人及亲友借贷';
  if (cleaned.includes('消费贷') || cleaned.includes('借贷') || cleaned.includes('分期'))
    return '消费与信用借贷';
  return direction === 'asset' ? '其他货币资产' : '其他借贷账务';
}

function normalizeDateString(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const s = String(raw ?? '').trim().replace(/\//g, '-');
  const match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizeMonthString(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}`;
    }
  }
  const s = String(raw ?? '').trim().replace(/\//g, '-');
  const match = s.match(/^(\d{4})-(\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}`;
  }
  return new Date().toISOString().slice(0, 7);
}

function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  const cleaned = String(raw ?? '').replace(/[¥￥,\s元]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function exportFullWorkbookToExcel(params: {
  filename: string;
  report: SummaryReport;
  entries: LedgerEntry[];
  templates: FixedExpenseTemplate[];
  assetAccounts: AssetAccountItem[];
  tags: CategoryTag[];
}) {
  const { filename, report, entries, templates, assetAccounts, tags } = params;
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));
  const wb = XLSX.utils.book_new();

  // Sheet 1: 收支汇总报表
  const summaryRows: (string | number)[][] = [
    ['家庭收入与硬性支出汇总报表', report.periodLabel],
    [],
    ['一、核心收支指标', '金额（元）', '说明 / 占比'],
    ['家庭总收入', Number(report.totalIncome.toFixed(2)), `共 ${report.incomeCount} 笔`],
    [
      '硬性固定支出',
      Number(report.totalExpense.toFixed(2)),
      `占总收入 ${report.expenseRatio.toFixed(1)}%`,
    ],
    ['其中：已扣款支出', Number(report.paidExpense.toFixed(2)), '已确认支付'],
    ['其中：待扣款支出', Number(report.pendingExpense.toFixed(2)), '待扣款 / 预留'],
    [
      '可支配收入（总收入 - 固定支出）',
      Number(report.disposableIncome.toFixed(2)),
      `可支配比例 ${report.disposableRate.toFixed(1)}%`,
    ],
    [],
    ['二、按分类标签汇总', '分类标签', '笔数', '合计金额（元）', '占同类比例（%）'],
  ];

  for (const item of report.incomeByCategory) {
    summaryRows.push([
      '家庭收入',
      item.categoryName,
      item.count,
      Number(item.total.toFixed(2)),
      `${item.sharePercent.toFixed(1)}%`,
    ]);
  }
  for (const item of report.expenseByCategory) {
    summaryRows.push([
      '硬性支出',
      item.categoryName,
      item.count,
      Number(item.total.toFixed(2)),
      `${item.sharePercent.toFixed(1)}%`,
    ]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, '收支汇总报表');

  // Sheet 2: 收支明细
  const entryRows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      日期: e.date,
      收支类型: e.type === 'income' ? '家庭收入' : '硬性支出',
      项目名称: e.title,
      分类标签: tagMap.get(e.categoryId) || '未分类',
      家庭成员: e.member,
      '金额（元）': Number(e.amount.toFixed(2)),
      状态:
        e.type === 'income'
          ? e.status === 'paid'
            ? '已入账'
            : '待入账'
          : e.status === 'paid'
            ? '已扣款'
            : '待扣款',
      备注: e.notes || '',
    }));

  const wsEntries = XLSX.utils.json_to_sheet(
    entryRows.length > 0
      ? entryRows
      : [
          {
            日期: '',
            收支类型: '',
            项目名称: '',
            分类标签: '',
            家庭成员: '',
            '金额（元）': 0,
            状态: '',
            备注: '',
          },
        ]
  );
  wsEntries['!cols'] = [
    { wch: 13 },
    { wch: 12 },
    { wch: 26 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEntries, '收支明细');

  // Sheet 3: 每月固定开支模板
  const tplRows = [...templates]
    .sort((a, b) => a.dueDay - b.dueDay)
    .map((t) => ({
      固定开支名称: t.title,
      '每月标准金额（元）': Number(t.amount.toFixed(2)),
      分类标签: tagMap.get(t.categoryId) || '未分类',
      每月扣款日: t.dueDay,
      责任成员: t.member,
      启用状态: t.active ? '启用' : '暂停',
      说明备注: t.notes || '',
    }));
  const wsTemplates = XLSX.utils.json_to_sheet(
    tplRows.length > 0
      ? tplRows
      : [
          {
            固定开支名称: '',
            '每月标准金额（元）': 0,
            分类标签: '',
            每月扣款日: 10,
            责任成员: '',
            启用状态: '启用',
            说明备注: '',
          },
        ]
  );
  wsTemplates['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplates, '每月固定开支模板');

  // Sheet 4: 月底资产借贷
  const assetRows = [...assetAccounts]
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey) || a.direction.localeCompare(b.direction))
    .map((a) => ({
      盘点月份: a.monthKey,
      大类: a.direction === 'asset' ? '货币资产' : '借贷与信用卡',
      细分类型: a.category,
      账户名称: a.name,
      所属机构: a.institution,
      '期末余额或已用额度（元）': Number(a.amount.toFixed(2)),
      '信用卡总额度（元）': a.creditLimit ? Number(a.creditLimit.toFixed(2)) : '',
      归属成员: a.member,
      备注: a.notes || '',
    }));
  const wsAssets = XLSX.utils.json_to_sheet(
    assetRows.length > 0
      ? assetRows
      : [
          {
            盘点月份: '',
            大类: '',
            细分类型: '',
            账户名称: '',
            所属机构: '',
            '期末余额或已用额度（元）': 0,
            '信用卡总额度（元）': '',
            归属成员: '',
            备注: '',
          },
        ]
  );
  wsAssets['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 26 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAssets, '月底资产借贷');

  // Sheet 5: 分类标签
  const tagRows = tags.map((t) => ({
    标签名称: t.name,
    所属类型: t.type === 'income' ? '家庭收入' : '硬性支出',
    标识色: t.color,
  }));
  const wsTags = XLSX.utils.json_to_sheet(tagRows);
  wsTags['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsTags, '分类标签');

  XLSX.writeFile(wb, filename);
}

export function exportAssetSnapshotToExcel(
  filename: string,
  monthLabel: string,
  assets: AssetAccountItem[]
) {
  const wb = XLSX.utils.book_new();
  const totalAssets = assets
    .filter((a) => a.direction === 'asset')
    .reduce((acc, a) => acc + a.amount, 0);
  const totalLiab = assets
    .filter((a) => a.direction === 'liability')
    .reduce((acc, a) => acc + a.amount, 0);

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['家庭月底货币资产与借贷统计汇总', monthLabel],
    [],
    ['指标项目', '金额（元）'],
    ['货币资产总计（储蓄卡/货基/积存金/股票等）', Number(totalAssets.toFixed(2))],
    ['借贷与信用卡待还总计', Number(totalLiab.toFixed(2))],
    ['家庭净货币资产', Number((totalAssets - totalLiab).toFixed(2))],
  ]);
  summarySheet['!cols'] = [{ wch: 38 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, '资产借贷汇总');

  const detailRows = assets.map((a) => ({
    盘点月份: a.monthKey,
    大类: a.direction === 'asset' ? '货币资产' : '借贷与信用卡',
    细分类型: a.category,
    账户名称: a.name,
    所属机构: a.institution,
    '期末余额或已用额度（元）': Number(a.amount.toFixed(2)),
    '信用卡总额度（元）': a.creditLimit ? Number(a.creditLimit.toFixed(2)) : '',
    归属成员: a.member,
    备注: a.notes || '',
  }));

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 26 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, '月底资产借贷');

  XLSX.writeFile(wb, filename);
}

export function downloadImportTemplateExcel() {
  const wb = XLSX.utils.book_new();

  const wsEntries = XLSX.utils.json_to_sheet([
    {
      日期: '2026-11-08',
      收支类型: '家庭收入',
      项目名称: '11月工资薪金',
      分类标签: '工资薪金',
      家庭成员: '先生',
      '金额（元）': 16800,
      状态: '已入账',
      备注: '示例收入记录，可直接修改或新增行',
    },
    {
      日期: '2026-11-10',
      收支类型: '硬性支出',
      项目名称: '自住房按揭月供',
      分类标签: '房贷 / 房租',
      家庭成员: '共同账户',
      '金额（元）': 7650,
      状态: '已扣款',
      备注: '示例硬性支出记录',
    },
  ]);
  wsEntries['!cols'] = [
    { wch: 13 },
    { wch: 12 },
    { wch: 24 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEntries, '收支明细');

  const wsTemplates = XLSX.utils.json_to_sheet([
    {
      固定开支名称: '自住房商业+公积金按揭',
      '每月标准金额（元）': 7650,
      分类标签: '房贷 / 房租',
      每月扣款日: 10,
      责任成员: '共同账户',
      启用状态: '启用',
      说明备注: '每月10日自动扣款',
    },
  ]);
  wsTemplates['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplates, '每月固定开支模板');

  const wsAssets = XLSX.utils.json_to_sheet([
    {
      盘点月份: '2026-11',
      大类: '货币资产',
      细分类型: '储蓄卡余额',
      账户名称: '招商银行储蓄卡',
      所属机构: '招商银行',
      '期末余额或已用额度（元）': 85000,
      '信用卡总额度（元）': '',
      归属成员: '共同账户',
      备注: '月底储蓄余额示例',
    },
    {
      盘点月份: '2026-11',
      大类: '货币资产',
      细分类型: '货币基金',
      账户名称: '余额宝',
      所属机构: '支付宝',
      '期末余额或已用额度（元）': 62000,
      '信用卡总额度（元）': '',
      归属成员: '共同账户',
      备注: '',
    },
    {
      盘点月份: '2026-11',
      大类: '货币资产',
      细分类型: '积存金',
      账户名称: '工行积存金',
      所属机构: '工商银行',
      '期末余额或已用额度（元）': 48000,
      '信用卡总额度（元）': '',
      归属成员: '共同账户',
      备注: '',
    },
    {
      盘点月份: '2026-11',
      大类: '货币资产',
      细分类型: '股票账户',
      账户名称: '华泰证券股票账户',
      所属机构: '华泰证券',
      '期末余额或已用额度（元）': 135000,
      '信用卡总额度（元）': '',
      归属成员: '先生',
      备注: '',
    },
    {
      盘点月份: '2026-11',
      大类: '借贷与信用卡',
      细分类型: '信用卡支出额度',
      账户名称: '招行信用卡',
      所属机构: '招商银行',
      '期末余额或已用额度（元）': 5800,
      '信用卡总额度（元）': 50000,
      归属成员: '共同账户',
      备注: '当月已出与未出账单合计',
    },
  ]);
  wsAssets['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAssets, '月底资产借贷');

  XLSX.writeFile(wb, '家计账本_Excel导入标准模板.xlsx');
}

export interface ParsedExcelResult {
  entries: LedgerEntry[];
  templates: FixedExpenseTemplate[];
  assetAccounts: AssetAccountItem[];
  newTags: CategoryTag[];
  warnings: string[];
}

function getField(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  const lowerKeys = Object.keys(row);
  for (const cand of candidates) {
    const found = lowerKeys.find((k) => k.trim().toLowerCase() === cand.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== '') return row[found];
  }
  return undefined;
}

export async function parseExcelWorkbook(
  file: File,
  existingTags: CategoryTag[]
): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const entries: LedgerEntry[] = [];
  const templates: FixedExpenseTemplate[] = [];
  const assetAccounts: AssetAccountItem[] = [];
  const newTags: CategoryTag[] = [];
  const warnings: string[] = [];

  const workingTags = [...existingTags];
  const resolveTagId = (nameRaw: string, type: EntryType): string => {
    const name = nameRaw.trim() || (type === 'income' ? '其他收入' : '其他支出');
    const existing = workingTags.find((t) => t.type === type && t.name === name);
    if (existing) return existing.id;
    const color =
      TAG_COLOR_PALETTE[workingTags.length % TAG_COLOR_PALETTE.length].value;
    const created: CategoryTag = {
      id: createId('tag'),
      name,
      type,
      color,
      isDefault: false,
    };
    workingTags.push(created);
    newTags.push(created);
    return created.id;
  };

  const tagsSheetName = wb.SheetNames.find((n) => n.includes('分类标签'));
  if (tagsSheetName) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[tagsSheetName]);
    for (const row of rows) {
      const name = String(getField(row, ['标签名称', '名称', 'name']) ?? '').trim();
      const typeStr = String(getField(row, ['所属类型', '类型', 'type']) ?? '');
      const color = String(getField(row, ['标识色', '颜色', 'color']) ?? '').trim();
      if (!name) continue;
      const type: EntryType = typeStr.includes('收入') ? 'income' : 'fixed_expense';
      const existing = workingTags.find((t) => t.type === type && t.name === name);
      if (!existing) {
        const created: CategoryTag = {
          id: createId('tag'),
          name,
          type,
          color: color.startsWith('#') ? color : TAG_COLOR_PALETTE[workingTags.length % TAG_COLOR_PALETTE.length].value,
          isDefault: false,
        };
        workingTags.push(created);
        newTags.push(created);
      }
    }
  }

  for (const sheetName of wb.SheetNames) {
    if (sheetName.includes('汇总') || sheetName.includes('分类标签')) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
    if (rows.length === 0) continue;

    const firstKeys = Object.keys(rows[0]).join(',');

    // 1. Asset & Credit/Loan sheet
    if (
      sheetName.includes('资产') ||
      sheetName.includes('借贷') ||
      sheetName.includes('负债') ||
      firstKeys.includes('盘点月份') ||
      firstKeys.includes('账户名称')
    ) {
      rows.forEach((row, idx) => {
        const name = String(getField(row, ['账户名称', '名称', '账户']) ?? '').trim();
        if (!name) return;
        const rawDir = String(getField(row, ['大类', '资产借贷类型', '资产负债类型', '方向']) ?? '');
        const rawSub = String(getField(row, ['细分类型', '资产类型', '类别']) ?? '');
        const isLiab =
          rawDir.includes('负债') ||
          rawDir.includes('借贷') ||
          rawDir.includes('信用卡') ||
          rawSub.includes('信用卡') ||
          rawSub.includes('借贷');
        const direction: AccountDirection = isLiab ? 'liability' : 'asset';
        const category = normalizeAssetCategory(rawSub, direction);
        const amount = toNumber(
          getField(row, [
            '期末余额或已用额度（元）',
            '期末余额或已用额度',
            '余额',
            '金额',
            '金额（元）',
          ])
        );
        const creditLimitVal = toNumber(
          getField(row, ['信用卡总额度（元）', '信用卡总额度', '授信额度'])
        );
        const monthKey = normalizeMonthString(getField(row, ['盘点月份', '月份', '日期']));
        const institution = String(
          getField(row, ['所属机构', '机构', '银行']) ?? '未填写机构'
        ).trim();
        const rawMember = String(getField(row, ['归属成员', '成员']) ?? '').trim();
        const member =
          rawMember === '家庭共同' ? '共同账户' : rawMember || DEFAULT_MEMBERS[0];
        const notes = String(getField(row, ['备注', '说明']) ?? '').trim();

        const allowNegative = category === '信用卡支出额度';
        if (amount < 0 && !allowNegative) {
          warnings.push(`工作表「${sheetName}」第 ${idx + 2} 行金额为负数，已按 0 处理`);
        }

        assetAccounts.push({
          id: createId('asset'),
          monthKey,
          direction,
          category,
          name,
          institution,
          amount: allowNegative ? amount : Math.max(0, amount),
          creditLimit: creditLimitVal > 0 ? creditLimitVal : undefined,
          member,
          notes: notes || undefined,
          updatedAt: new Date().toISOString(),
        });
      });

      // Backfill missing credit card limits from other rows in the same workbook (forward/backward)
      for (let i = 0; i < assetAccounts.length; i++) {
        const item = assetAccounts[i];
        if (item.category === '信用卡支出额度' && !item.creditLimit) {
          const resolved = resolveCreditLimitForCard(
            assetAccounts,
            item.monthKey,
            item.name,
            item.institution,
            item.member
          );
          if (resolved) {
            assetAccounts[i] = { ...item, creditLimit: resolved.creditLimit };
          }
        }
      }
      continue;
    }

    // 2. Fixed Expense Templates sheet
    if (
      sheetName.includes('模板') ||
      firstKeys.includes('固定开支名称') ||
      firstKeys.includes('每月扣款日')
    ) {
      rows.forEach((row) => {
        const title = String(
          getField(row, ['固定开支名称', '项目名称', '名称']) ?? ''
        ).trim();
        if (!title) return;
        const amount = toNumber(
          getField(row, ['每月标准金额（元）', '每月标准金额', '金额（元）', '金额'])
        );
        if (amount <= 0) return;
        const catName = String(getField(row, ['分类标签', '分类']) ?? '未分类支出');
        const dueDay = Math.min(
          31,
          Math.max(1, Math.round(toNumber(getField(row, ['每月扣款日', '扣款日'])) || 10))
        );
        const rawTplMember = String(getField(row, ['责任成员', '家庭成员', '成员']) ?? '').trim();
        const member =
          rawTplMember === '家庭共同' ? '共同账户' : rawTplMember || DEFAULT_MEMBERS[0];
        const activeStr = String(getField(row, ['启用状态', '状态']) ?? '启用');
        const notes = String(getField(row, ['说明备注', '备注']) ?? '').trim();

        templates.push({
          id: createId('tpl'),
          title,
          amount,
          categoryId: resolveTagId(catName, 'fixed_expense'),
          dueDay,
          member,
          active: !activeStr.includes('停') && !activeStr.includes('否'),
          notes: notes || undefined,
        });
      });
      continue;
    }

    // 3. Ledger Entries sheet
    if (
      sheetName.includes('明细') ||
      firstKeys.includes('项目名称') ||
      firstKeys.includes('金额')
    ) {
      rows.forEach((row, idx) => {
        const title = String(getField(row, ['项目名称', '名称', '摘要']) ?? '').trim();
        if (!title) return;
        const amount = toNumber(getField(row, ['金额（元）', '金额', 'amount']));
        if (amount <= 0) {
          warnings.push(`工作表「${sheetName}」第 ${idx + 2} 行「${title}」金额无效，已跳过`);
          return;
        }
        const typeStr = String(getField(row, ['收支类型', '类型', 'type']) ?? '');
        const type: EntryType = typeStr.includes('收入') ? 'income' : 'fixed_expense';
        const catName = String(getField(row, ['分类标签', '分类', '标签']) ?? '');
        const date = normalizeDateString(getField(row, ['日期', '发生日期', '入账日期']));
        const rawEntryMember = String(getField(row, ['家庭成员', '成员']) ?? '').trim();
        const member =
          rawEntryMember === '家庭共同' ? '共同账户' : rawEntryMember || DEFAULT_MEMBERS[0];
        const statusStr = String(getField(row, ['状态', '结算状态']) ?? '已');
        const notes = String(getField(row, ['备注', '说明']) ?? '').trim();

        entries.push({
          id: createId('entry'),
          title,
          amount,
          type,
          categoryId: resolveTagId(catName, type),
          date,
          member,
          status: statusStr.includes('待') ? 'pending' : 'paid',
          notes: notes || undefined,
          createdAt: new Date().toISOString(),
        });
      });
    }
  }

  return { entries, templates, assetAccounts, newTags, warnings };
}
