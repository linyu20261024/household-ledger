export function formatCurrency(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < 0) {
    return `-¥${formatted}`;
  }
  if (showSign && amount > 0) {
    return `+¥${formatted}`;
  }
  return `¥${formatted}`;
}

export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000) {
    return `${sign}¥${(abs / 10000).toFixed(1)}万`;
  }
  return `${sign}¥${Math.round(abs).toLocaleString('zh-CN')}`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

export function formatPeriodLabel(periodMode: 'month' | 'year', monthKey: string, yearKey: string): string {
  if (periodMode === 'year') {
    return `${yearKey} 年度`;
  }
  const [y, m] = monthKey.split('-');
  return `${y}年${Number(m)}月`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  let y = Number(yStr);
  let m = Number(mStr) - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSvgElement(svgEl: SVGSVGElement | null, filename: string) {
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const serializer = new XMLSerializer();
  const source = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
  downloadTextFile(filename, source, 'image/svg+xml;charset=utf-8');
}

export function exportSvgAsPng(
  svgEl: SVGSVGElement | null,
  filename: string,
  titleText?: string
) {
  if (!svgEl) return;
  const rect = svgEl.getBoundingClientRect();
  const width = Math.max(rect.width, Number(svgEl.getAttribute('viewBox')?.split(' ')[2]) || 800);
  const height = Math.max(rect.height, Number(svgEl.getAttribute('viewBox')?.split(' ')[3]) || 360);
  const scale = 2;
  const headerOffset = titleText ? 48 : 16;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = (width + 48) * scale;
    canvas.height = (height + headerOffset + 24) * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width + 48, height + headerOffset + 24);

    if (titleText) {
      ctx.fillStyle = '#0F172A';
      ctx.font = '600 15px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(titleText, 24, 30);
    }

    ctx.drawImage(img, 24, headerOffset, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  img.src = url;
}
