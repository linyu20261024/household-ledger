import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

const LEDGER_STORAGE_KEYS = [
  'household_ledger_entries_v2',
  'household_ledger_templates_v2',
  'household_ledger_tags_v2',
  'household_ledger_assets_v2',
];

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || '未知渲染错误',
    };
  }

  handleResetAndReload = () => {
    try {
      for (const key of LEDGER_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-base font-bold text-slate-900">页面渲染异常</h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              可能是本地缓存了旧版本数据格式，或当前浏览器状态异常，导致页面未能正常显示。
            </p>
            {this.state.message && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-500 break-all">
                {this.state.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
              >
                刷新重试
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="flex-1 min-h-[42px] px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                清除旧缓存并刷新
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
