import {
  AccountDirection,
  AssetAccountItem,
  AssetCategory,
  CategoryTag,
  FixedExpenseTemplate,
  LedgerEntry,
} from '../types/ledger';

export const TAG_COLOR_PALETTE: { label: string; value: string }[] = [
  { label: '深青绿', value: '#0F766E' },
  { label: '森林绿', value: '#16A34A' },
  { label: '海湾蓝', value: '#0284C7' },
  { label: '靛青蓝', value: '#4F46E5' },
  { label: '琥珀金', value: '#D97706' },
  { label: '珊瑚红', value: '#DC2626' },
  { label: '赤陶橙', value: '#EA580C' },
  { label: '青石灰', value: '#475569' },
  { label: '梅子紫', value: '#9333EA' },
  { label: '玫瑰棕', value: '#BE123C' },
];

export const DEFAULT_MEMBERS = ['先生', '太太', '父母', '共同账户'];

export const ASSET_CATEGORY_META: {
  category: AssetCategory;
  direction: AccountDirection;
  color: string;
  description: string;
}[] = [
  { category: '储蓄卡余额', direction: 'asset', color: '#0F766E', description: '各银行活期/定存储蓄卡' },
  { category: '货币基金', direction: 'asset', color: '#0284C7', description: '余额宝、零钱通、现金理财' },
  { category: '积存金', direction: 'asset', color: '#D97706', description: '银行积存金、黄金定投市值' },
  { category: '股票账户', direction: 'asset', color: '#4F46E5', description: '证券股票账户、场内外基金' },
  { category: '借出及应收款', direction: 'asset', color: '#0D9488', description: '借给亲友/他人的钱、待收回欠款或押金' },
  { category: '其他货币资产', direction: 'asset', color: '#475569', description: '公积金可提取额、现金等' },
  { category: '信用卡支出额度', direction: 'liability', color: '#DC2626', description: '信用卡已用待还账单额度' },
  { category: '消费与信用借贷', direction: 'liability', color: '#EA580C', description: '银行消费贷、分期未还余额' },
  { category: '私人及亲友借贷', direction: 'liability', color: '#BE123C', description: '向亲友借入的待还欠款（我方欠款）' },
  { category: '其他借贷账务', direction: 'liability', color: '#64748B', description: '其他应付款项与负债' },
  { category: '商业贷款本金', direction: 'mortgage', color: '#B45309', description: '银行个人住房商业贷款剩余本金' },
  { category: '公积金贷款本金', direction: 'mortgage', color: '#0369A1', description: '住房公积金贷款剩余未还本金' },
];

export const DEFAULT_TAGS: CategoryTag[] = [
  // 家庭收入标签
  { id: 'tag-inc-salary', name: '工资薪金', type: 'income', color: '#0F766E', isDefault: true },
  { id: 'tag-inc-bonus', name: '奖金分红', type: 'income', color: '#16A34A', isDefault: true },
  { id: 'tag-inc-side', name: '副业与稿酬', type: 'income', color: '#0284C7', isDefault: true },
  { id: 'tag-inc-invest', name: '理财与利息', type: 'income', color: '#4F46E5', isDefault: true },
  { id: 'tag-inc-rent', name: '租金及其他', type: 'income', color: '#475569', isDefault: true },

  // 硬性支出标签
  { id: 'tag-exp-housing', name: '房贷 / 房租', type: 'fixed_expense', color: '#DC2626', isDefault: true },
  { id: 'tag-exp-utilities', name: '物业水电燃气', type: 'fixed_expense', color: '#EA580C', isDefault: true },
  { id: 'tag-exp-edu', name: '教育与托育', type: 'fixed_expense', color: '#D97706', isDefault: true },
  { id: 'tag-exp-insurance', name: '社保与商业保险', type: 'fixed_expense', color: '#0284C7', isDefault: true },
  { id: 'tag-exp-transport', name: '车贷与通勤', type: 'fixed_expense', color: '#4F46E5', isDefault: true },
  { id: 'tag-exp-elder', name: '老人赡养费', type: 'fixed_expense', color: '#BE123C', isDefault: true },
  { id: 'tag-exp-telecom', name: '宽带通信与订阅', type: 'fixed_expense', color: '#475569', isDefault: true },
];

export const DEFAULT_TEMPLATES: FixedExpenseTemplate[] = [
  {
    id: 'tpl-mortgage',
    title: '自住房商业+公积金按揭',
    amount: 7650,
    categoryId: 'tag-exp-housing',
    dueDay: 10,
    member: '共同账户',
    active: true,
    notes: '每月10日银行自动扣款',
  },
  {
    id: 'tpl-property',
    title: '小区物业费与车位管理费',
    amount: 520,
    categoryId: 'tag-exp-utilities',
    dueDay: 5,
    member: '共同账户',
    active: true,
    notes: '含地下车位月度管理费',
  },
  {
    id: 'tpl-utilities',
    title: '水电燃气基础账单',
    amount: 480,
    categoryId: 'tag-exp-utilities',
    dueDay: 15,
    member: '太太',
    active: true,
    notes: '按月均值预留，实际扣款后可微调',
  },
  {
    id: 'tpl-education',
    title: '幼儿园保育与课后素养课',
    amount: 2800,
    categoryId: 'tag-exp-edu',
    dueDay: 3,
    member: '共同账户',
    active: true,
    notes: '每月3日统一缴纳',
  },
  {
    id: 'tpl-car-loan',
    title: '新能源汽车月供',
    amount: 2150,
    categoryId: 'tag-exp-transport',
    dueDay: 18,
    member: '先生',
    active: true,
    notes: '36期免息分期',
  },
  {
    id: 'tpl-insurance',
    title: '家庭医疗险与重疾险月摊',
    amount: 1380,
    categoryId: 'tag-exp-insurance',
    dueDay: 20,
    member: '共同账户',
    active: true,
    notes: '年缴保费按12个月计提预留',
  },
  {
    id: 'tpl-elder',
    title: '双方父母月度生活补贴',
    amount: 2000,
    categoryId: 'tag-exp-elder',
    dueDay: 25,
    member: '共同账户',
    active: true,
    notes: '每月25日固定转账',
  },
  {
    id: 'tpl-telecom',
    title: '千兆宽带与家庭套餐话费',
    amount: 239,
    categoryId: 'tag-exp-telecom',
    dueDay: 1,
    member: '先生',
    active: true,
    notes: '含全家副卡及云盘会员',
  },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function clampDay(year: number, month: number, day: number): number {
  const maxDay = new Date(year, month, 0).getDate();
  return Math.min(day, maxDay);
}

export function generateSeedEntries(): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const year = 2026;
  const utilityVariance = [460, 510, 440, 420, 455, 530, 620, 645, 495, 450, 480];
  const sideIncomeByMonth = [1800, 1200, 2400, 1500, 2100, 3200, 1900, 2600, 2200, 2800, 2500];
  const investIncomeByMonth = [620, 580, 640, 610, 650, 680, 670, 690, 710, 730, 745];

  for (let month = 1; month <= 11; month++) {
    const mm = pad2(month);
    const monthStr = `${year}-${mm}`;

    entries.push({
      id: `seed-inc-mr-${monthStr}`,
      title: `${month}月税后工资薪金`,
      amount: 16800,
      type: 'income',
      categoryId: 'tag-inc-salary',
      date: `${monthStr}-08`,
      member: '先生',
      status: 'paid',
      notes: '主业月度实发薪资',
      createdAt: `${monthStr}-08T09:00:00Z`,
    });

    entries.push({
      id: `seed-inc-mrs-${monthStr}`,
      title: `${month}月税后工资薪金`,
      amount: 12400,
      type: 'income',
      categoryId: 'tag-inc-salary',
      date: `${monthStr}-10`,
      member: '太太',
      status: 'paid',
      notes: '主业月度实发薪资',
      createdAt: `${monthStr}-10T09:00:00Z`,
    });

    if (month === 1) {
      entries.push({
        id: `seed-inc-bonus-1`,
        title: '年度绩效与年终奖金',
        amount: 32000,
        type: 'income',
        categoryId: 'tag-inc-bonus',
        date: `2026-01-22`,
        member: '共同账户',
        status: 'paid',
        notes: '双方年度绩效奖金合并入账',
        createdAt: `2026-01-22T10:00:00Z`,
      });
    } else if (month === 4 || month === 7 || month === 10) {
      entries.push({
        id: `seed-inc-bonus-${month}`,
        title: `第${Math.floor((month - 1) / 3)}季度绩效奖金`,
        amount: 6500,
        type: 'income',
        categoryId: 'tag-inc-bonus',
        date: `${monthStr}-15`,
        member: '先生',
        status: 'paid',
        notes: '季度考核发放',
        createdAt: `${monthStr}-15T10:00:00Z`,
      });
    }

    entries.push({
      id: `seed-inc-side-${monthStr}`,
      title: '设计咨询与副业结算',
      amount: sideIncomeByMonth[month - 1],
      type: 'income',
      categoryId: 'tag-inc-side',
      date: `${monthStr}-14`,
      member: '太太',
      status: 'paid',
      notes: '月度业余项目收入',
      createdAt: `${monthStr}-14T15:00:00Z`,
    });

    entries.push({
      id: `seed-inc-inv-${monthStr}`,
      title: '稳健理财与国债利息分红',
      amount: investIncomeByMonth[month - 1],
      type: 'income',
      categoryId: 'tag-inc-invest',
      date: `${monthStr}-16`,
      member: '共同账户',
      status: 'paid',
      notes: '家庭备付金理财收益',
      createdAt: `${monthStr}-16T12:00:00Z`,
    });

    DEFAULT_TEMPLATES.forEach((tpl) => {
      const day = clampDay(year, month, tpl.dueDay);
      const dd = pad2(day);
      const isNovPending = month === 11 && day > 18;
      const amount =
        tpl.id === 'tpl-utilities' ? utilityVariance[month - 1] : tpl.amount;

      entries.push({
        id: `seed-${tpl.id}-${monthStr}`,
        title: tpl.title,
        amount,
        type: 'fixed_expense',
        categoryId: tpl.categoryId,
        date: `${monthStr}-${dd}`,
        member: tpl.member,
        status: isNovPending ? 'pending' : 'paid',
        templateId: tpl.id,
        notes: tpl.notes,
        createdAt: `${monthStr}-${dd}T08:00:00Z`,
      });
    });
  }

  return entries;
}

export function generateSeedAssetAccounts(): AssetAccountItem[] {
  const items: AssetAccountItem[] = [];
  const year = 2026;

  // Generate realistic progressive month-end monetary snapshots from Jan to Nov 2026
  for (let m = 1; m <= 11; m++) {
    const monthKey = `${year}-${pad2(m)}`;
    const updatedAt = `${monthKey}-${pad2(clampDay(year, m, 28))}T20:00:00Z`;
    const growth = (m - 1) * 4200;

    // 1. 储蓄卡余额
    items.push({
      id: `seed-asset-cmb-${monthKey}`,
      monthKey,
      direction: 'asset',
      category: '储蓄卡余额',
      name: '招商银行一卡通储蓄卡',
      institution: '招商银行',
      amount: 62500 + growth * 0.45 + (m === 1 ? 18000 : 0),
      member: '共同账户',
      notes: '家庭日常备用金与房贷归集卡',
      updatedAt,
    });
    items.push({
      id: `seed-asset-icbc-${monthKey}`,
      monthKey,
      direction: 'asset',
      category: '储蓄卡余额',
      name: '工商银行工资储蓄卡',
      institution: '工商银行',
      amount: 28400 + (m % 3) * 2600,
      member: '先生',
      notes: '代发工资账户活期结余',
      updatedAt,
    });
    items.push({
      id: `seed-asset-ccb-${monthKey}`,
      monthKey,
      direction: 'asset',
      category: '储蓄卡余额',
      name: '建设银行储蓄卡',
      institution: '建设银行',
      amount: 19200 + m * 850,
      member: '太太',
      notes: '教育与旅游专项存款',
      updatedAt,
    });

    // 2. 货币基金
    items.push({
      id: `seed-asset-yeb-${monthKey}`,
      monthKey,
      direction: 'asset',
      category: '货币基金',
      name: '余额宝（家庭流动现金池）',
      institution: '支付宝 / 天弘基金',
      amount: 54000 + m * 1900,
      member: '共同账户',
      notes: '随取随用流动资金',
      updatedAt,
    });
    items.push({
      id: `seed-asset-lqt-${monthKey}`,
      monthKey,
      direction: 'asset',
      category: '货币基金',
      name: '微信零钱通货币基金',
      institution: '腾讯理财通',
      amount: 16800 + (m % 4) * 1450,
      member: '太太',
      notes: '日常消费零钱池',
      updatedAt,
    });

    // 3. 积存金
    items.push({
      id: `seed-asset-gold-${monthKey}`,
      monthKey,
      direction: 'asset',
      category: '积存金',
      name: '工行如意金积存账户',
      institution: '工商银行',
      amount: 34200 + m * 1650,
      member: '共同账户',
      notes: '每月定投2克黄金累计市值',
      updatedAt,
    });

    // 4. 股票账户
    const marketWave = [0, 3200, 5800, 2900, 7400, 9100, 11800, 8600, 13400, 15200, 17900][m - 1];
    items.push({
      id: `seed-asset-stock-${monthKey}`,
      monthKey,
      direction: 'asset',
      category: '股票账户',
      name: '华泰证券股票与ETF账户',
      institution: '华泰证券',
      amount: 118000 + marketWave,
      member: '先生',
      notes: '红利低波ETF与沪深300持仓市值',
      updatedAt,
    });

    // 5. 信用卡支出额度
    const cmbCardSpent = [5820, 4910, 5340, 6120, 5680, 7240, 6450, 6890, 5430, 6710, 5940][m - 1];
    items.push({
      id: `seed-liab-cmbcc-${monthKey}`,
      monthKey,
      direction: 'liability',
      category: '信用卡支出额度',
      name: '招行银联白金信用卡',
      institution: '招商银行',
      amount: cmbCardSpent,
      creditLimit: 50000,
      member: '共同账户',
      notes: '当月已出+未出账单待还消费额度',
      updatedAt,
    });

    const spdbCardSpent = [2140, 1890, 2450, 1760, 2980, 3420, 2610, 2190, 2850, 2340, 2180][m - 1];
    items.push({
      id: `seed-liab-spdbcc-${monthKey}`,
      monthKey,
      direction: 'liability',
      category: '信用卡支出额度',
      name: '浦发AE白金信用卡',
      institution: '浦发银行',
      amount: spdbCardSpent,
      creditLimit: 30000,
      member: '先生',
      notes: '商旅及日常网购账单',
      updatedAt,
    });

    // 6. 借贷账务
    const carInstallmentLeft = Math.max(0, 45150 - (m - 1) * 2150);
    items.push({
      id: `seed-liab-loan-${monthKey}`,
      monthKey,
      direction: 'liability',
      category: '消费与信用借贷',
      name: '新能源车免息分期剩余本金',
      institution: '汽车金融公司',
      amount: carInstallmentLeft,
      member: '先生',
      notes: '36期免息分期期末剩余本金',
      updatedAt,
    });
  }

  return items;
}
