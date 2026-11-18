export type EntryType = 'income' | 'fixed_expense';

export type PaymentStatus = 'paid' | 'pending';

export type PeriodMode = 'month' | 'year';

export type NavSection =
  | 'overview'
  | 'templates'
  | 'reports'
  | 'assets'
  | 'analytics'
  | 'tags';

export interface CategoryTag {
  id: string;
  name: string;
  type: EntryType;
  color: string;
  isDefault?: boolean;
}

export interface LedgerEntry {
  id: string;
  title: string;
  amount: number;
  type: EntryType;
  categoryId: string;
  date: string; // YYYY-MM-DD
  member: string;
  status: PaymentStatus;
  templateId?: string;
  notes?: string;
  createdAt: string;
}

export interface FixedExpenseTemplate {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  dueDay: number; // 1-31
  member: string;
  active: boolean;
  notes?: string;
}

export interface CategorySummaryItem {
  categoryId: string;
  categoryName: string;
  color: string;
  type: EntryType;
  total: number;
  count: number;
  sharePercent: number;
}

export interface SummaryReport {
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  paidExpense: number;
  pendingExpense: number;
  disposableIncome: number;
  expenseRatio: number; // fixed expense / income * 100
  disposableRate: number; // disposableIncome / income * 100
  incomeCount: number;
  expenseCount: number;
  incomeByCategory: CategorySummaryItem[];
  expenseByCategory: CategorySummaryItem[];
  previousIncome?: number;
  previousExpense?: number;
  previousDisposable?: number;
}

export interface MonthlyTrendPoint {
  monthKey: string; // YYYY-MM
  label: string; // 1月 .. 12月
  income: number;
  expense: number;
  disposableIncome: number;
}

// --- Month-End Household Monetary Assets & Liabilities ---

export type AccountDirection = 'asset' | 'liability';

export type AssetCategory =
  | '储蓄卡余额'
  | '货币基金'
  | '积存金'
  | '股票账户'
  | '借出及应收款'
  | '其他货币资产'
  | '信用卡支出额度'
  | '消费与信用借贷'
  | '私人及亲友借贷'
  | '其他借贷账务';

export interface AssetAccountItem {
  id: string;
  monthKey: string; // YYYY-MM
  direction: AccountDirection;
  category: AssetCategory;
  name: string;
  institution: string;
  amount: number; // 资产期末余额 或 负债待还/信用卡已用额度
  creditLimit?: number; // 仅信用卡适用：授信总额度
  member: string;
  notes?: string;
  updatedAt: string;
}

export interface AssetCategoryBreakdownItem {
  category: AssetCategory;
  direction: AccountDirection;
  color: string;
  total: number;
  count: number;
  sharePercent: number;
}

export interface AssetSnapshotSummary {
  monthKey: string;
  totalAssets: number;
  totalLiabilities: number;
  netMonetaryAssets: number;
  creditCardSpent: number;
  creditCardLimit: number;
  creditCardUtilization: number;
  loanTotal: number;
  assetCount: number;
  liabilityCount: number;
  assetsByCategory: AssetCategoryBreakdownItem[];
  liabilitiesByCategory: AssetCategoryBreakdownItem[];
  previousNetAssets?: number;
}

export interface AssetMonthTrendPoint {
  monthKey: string;
  label: string;
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
}
