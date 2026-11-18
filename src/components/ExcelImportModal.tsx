import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { CategoryTag } from '../types/ledger';
import {
  downloadImportTemplateExcel,
  ParsedExcelResult,
  parseExcelWorkbook,
} from '../utils/excel';

interface ExcelImportModalProps {
  open: boolean;
  tags: CategoryTag[];
  onClose: () => void;
  onConfirmImport: (result: ParsedExcelResult, mode: 'merge' | 'replace') => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  open,
  tags,
  onClose,
  onConfirmImport,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedExcelResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setLoading(true);
    setFileName(file.name);
    try {
      const res = await parseExcelWorkbook(file, tags);
      const totalItems =
        res.entries.length + res.templates.length + res.assetAccounts.length + res.newTags.length;
      if (totalItems === 0) {
        setError('未能从文件中识别到有效数据行，请参考标准 Excel 模板格式检查列名。');
        setParsed(null);
      } else {
        setParsed(res);
      }
    } catch {
      setError('解析 Excel 文件失败，请确认文件格式为 .xlsx、.xls 或 .csv。');
      setParsed(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!parsed) return;
    onConfirmImport(parsed, importMode);
    setParsed(null);
    setFileName('');
    setError('');
    onClose();
  };

  const handleResetAndClose = () => {
    setParsed(null);
    setFileName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/45 backdrop-blur-[1px]">
      <div
        className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-xl border border-slate-200 shadow-xl max-h-[92dvh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-import-title"
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <h2 id="excel-import-title" className="font-display text-base font-semibold text-slate-900">
              从 Excel 导入家庭账本数据
            </h2>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="min-w-[40px] min-h-[40px] -mr-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="关闭弹窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Template Download Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-600">
              支持导入本系统导出的全量 <strong className="text-slate-900">.xlsx</strong> 工作簿，或按标准模板整理的数据表。
            </div>
            <button
              type="button"
              onClick={downloadImportTemplateExcel}
              className="min-h-[40px] sm:min-h-[34px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载标准导入模板 (.xlsx)</span>
            </button>
          </div>

          {/* File Upload Dropzone */}
          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full py-7 sm:py-8 px-4 border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-xl bg-slate-50/50 hover:bg-teal-50/20 transition-colors flex flex-col items-center justify-center text-center cursor-pointer"
            >
              <Upload className="w-6 h-6 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-800">
                {loading
                  ? '正在解析 Excel 工作簿...'
                  : fileName
                    ? `已选择文件：${fileName}`
                    : '点击选择 .xlsx / .xls / .csv 文件'}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                自动识别「收支明细」「每月固定开支模板」「月底资产借贷」「分类标签」工作表
              </span>
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Preview */}
          {parsed && (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-lg space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-900">
                  <CheckCircle2 className="w-4 h-4 text-teal-700" />
                  <span>解析成功，待导入数据统计如下：</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white border border-teal-100 rounded-md p-2.5">
                    <div className="text-slate-500">收支明细</div>
                    <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                      {parsed.entries.length} 条
                    </div>
                  </div>
                  <div className="bg-white border border-teal-100 rounded-md p-2.5">
                    <div className="text-slate-500">固定开支模板</div>
                    <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                      {parsed.templates.length} 项
                    </div>
                  </div>
                  <div className="bg-white border border-teal-100 rounded-md p-2.5">
                    <div className="text-slate-500">月底资产借贷</div>
                    <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                      {parsed.assetAccounts.length} 条
                    </div>
                  </div>
                  <div className="bg-white border border-teal-100 rounded-md p-2.5">
                    <div className="text-slate-500">新增分类标签</div>
                    <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                      {parsed.newTags.length} 个
                    </div>
                  </div>
                </div>

                {parsed.warnings.length > 0 && (
                  <div className="text-[11px] text-amber-800 pt-1">
                    注意：{parsed.warnings.slice(0, 3).join('；')}
                    {parsed.warnings.length > 3 ? ` 等共 ${parsed.warnings.length} 条提示` : ''}
                  </div>
                )}
              </div>

              {/* Import Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">导入方式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`min-h-[40px] py-2 text-xs font-medium rounded-md transition-colors ${
                      importMode === 'merge'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    合并追加（保留现有）
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`min-h-[40px] py-2 text-xs font-medium rounded-md transition-colors ${
                      importMode === 'replace'
                        ? 'bg-white text-red-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    覆盖导入（替换对应表）
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white pb-safe shrink-0">
          <button
            type="button"
            onClick={handleResetAndClose}
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 sm:bg-transparent hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!parsed}
            onClick={handleConfirm}
            className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] px-5 py-2 text-xs font-semibold text-white rounded-lg transition-colors ${
              parsed
                ? 'bg-teal-700 hover:bg-teal-800 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            确认导入数据
          </button>
        </div>
      </div>
    </div>
  );
};
