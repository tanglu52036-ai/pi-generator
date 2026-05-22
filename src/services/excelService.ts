import ExcelJS from 'exceljs';
import { Customer, InvoiceItem, InvoiceInfo, SellerInfo, Fees, BankInfo, InvoiceRemarks } from '../types';

interface CustomRowData {
  id: string;
  label: string;
  value: string;
  beforeRowIndex?: number;
}

const fmt = (amount: number, currency: string): string => {
  const f = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'USD' ? '$' + f : f + ' ' + currency;
};

const buildMergedCols = (customs: { id: string; name: string; insertAfterFixedCol?: number }[]) => {
  const sorted = [...customs].sort((a, b) => (a.insertAfterFixedCol ?? 7) - (b.insertAfterFixedCol ?? 7));
  const result: Array<{ type: 'fixed'; idx: number } | { type: 'custom'; col: typeof customs[0] }> = [];
  for (const c of sorted) { if ((c.insertAfterFixedCol ?? 7) < 0) result.push({ type: 'custom', col: c }); }
  for (let f = 0; f < 8; f++) {
    result.push({ type: 'fixed', idx: f });
    for (const c of sorted) { if ((c.insertAfterFixedCol ?? 7) === f) result.push({ type: 'custom', col: c }); }
  }
  for (const c of sorted) { if ((c.insertAfterFixedCol ?? 7) >= 8) result.push({ type: 'custom', col: c }); }
  return result;
};

const borderThin: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

const borderBottom: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
};

export const exportToExcel = async (
  customer: Customer,
  items: InvoiceItem[],
  info: InvoiceInfo,
  seller: SellerInfo,
  fees: Fees,
  bank: BankInfo,
  remarks: InvoiceRemarks,
  customColumns: { id: string; name: string; insertAfterFixedCol?: number }[] = [],
  customColumnValues: Record<string, Record<string, string>> = {},
  productCustomRows: CustomRowData[] = [],
) => {
  const mergedCols = buildMergedCols(customColumns);
  const tCols = mergedCols.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'LOYO Product PI';
  const ws = wb.addWorksheet('PI', { views: [{ showGridLines: false }] });
  ws.pageSetup.orientation = 'portrait';
  ws.pageSetup.paperSize = 9;
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };

  // Column widths (in characters)
  const fixedWidths = [5, 24, 18, 52, 9, 9, 16, 18];
  mergedCols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.type === 'fixed' ? fixedWidths[col.idx] : 14;
  });
  // A column (labels: Company Name:, ACCOUNT NAME:, SHIPPING DAY:, etc.)
  ws.getColumn(1).width = 22.5;

  let r = 1;

  // ── cell helper ──
  const cell = (row: number, col: number, value: string | number, opts?: {
    bold?: boolean; sz?: number; align?: 'left' | 'center' | 'right';
    fill?: string; fontColor?: string; color?: string; bd?: Partial<ExcelJS.Borders>;
  }) => {
    const c = ws.getCell(row, col);
    c.value = value;
    c.border = opts?.bd || borderThin;
    c.alignment = { vertical: 'middle', horizontal: opts?.align || 'left', wrapText: true };
    const f: Partial<ExcelJS.Font> = { name: 'Helvetica', size: opts?.sz ?? 10 };
    if (opts?.bold) f.bold = true;
    if (opts?.fontColor) f.color = { argb: opts.fontColor };
    if (opts?.color) f.color = { argb: opts.color };
    c.font = f;
    if (opts?.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
    return c;
  };

  const merge = (r1: number, c1: number, r2: number, c2: number, value: string, opts?: any) => {
    ws.mergeCells(r1, c1, r2, c2);
    cell(r1, c1, value, opts);
  };
  const h = (row: number, height: number) => { ws.getRow(row).height = height; };

  // ============================================================
  // 1. SELLER HEADER — spans first 8 cols only (looks cleaner)
  // ============================================================
  const headCols = Math.min(tCols, 8);
  merge(r, 1, r, headCols, seller.companyName, { bold: true, sz: 15, align: 'center' });
  h(r, 30); r++;

  const sellerLines = [
    `Office Add: ${seller.officeAdd}`,
    `Factory Add: ${seller.factoryAdd}`,
    `New Factory Add: ${seller.newFactoryAdd}`,
  ];
  for (const line of sellerLines) {
    merge(r, 1, r, headCols, line, { sz: 9, align: 'center', bold: true });
    h(r, 20); r++;
  }

  merge(r, 1, r, headCols, `Tel: ${seller.tel}    Fax: ${seller.fax}    Email: ${seller.email}`, { sz: 9, align: 'center', bold: true });
  h(r, 20); r++;

  merge(r, 1, r, headCols, `Web: ${seller.web}`, { sz: 9, align: 'center', bold: true });
  h(r, 20); r++;

  r++;

  // ============================================================
  // 2. TITLE
  // ============================================================
  merge(r, 1, r, tCols, 'PROFORMA INVOICE', { bold: true, sz: 14, align: 'center', fill: 'FFB8CCE4' });
  h(r, 28); r++;

  r++;

  // ============================================================
  // 3. BUYER'S INFORMATION
  // ============================================================
  merge(r, 1, r, tCols, "Buyer's information", { bold: true, sz: 11, align: 'left' });
  h(r, 22); r++;

  const buyerRows: [string, string, boolean?][] = [
    ['Company Name:', customer.companyName, true],
    ['Address:', customer.address],
    ['Telephone/Fax:', customer.telFax],
    ['Contact:', customer.contact],
    ['Email Address:', customer.email],
    ['Invoice No.:', info.invoiceNo],
    ['Date:', info.date],
    ['payment:', info.payment, true],
  ];
  for (const [label, val, b] of buyerRows) {
    cell(r, 1, label, { bold: true, sz: 10, align: 'right' });
    merge(r, 2, r, tCols, val, { sz: 10, align: 'left', bold: !!b });
    for (let col = 2; col <= tCols; col++) {
      ws.getCell(r, col).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
    if (label === 'Address:' && val && val.length > 35) {
      const estimatedLines = Math.ceil(val.length / 45);
      h(r, Math.max(22, estimatedLines * 15 + 8));
    } else {
      h(r, 22);
    }
    r++;
  }

  r++;

  // ============================================================
  // 4. PRODUCT TABLE
  // ============================================================
  const headerNames = ['N', 'Model No', 'Picture', 'Description', 'QTY', 'Units', `Unit Price (${info.currency})`, `Amount(${info.currency})`];
  for (let ci = 0; ci < tCols; ci++) {
    const col = mergedCols[ci];
    const name = col.type === 'fixed' ? headerNames[col.idx] : col.col.name;
    cell(r, ci + 1, name, { bold: true, sz: 9, align: 'center', fill: 'FF4F81BD', fontColor: 'FFFFFFFF' });
  }
  const headerRow = r;
  h(r, 24); r++;

  // Build product data rows with image support
  const getBase64Image = async (url: string): Promise<string | null> => {
    if (!url || typeof url !== 'string' || !url.trim()) return null;
    try {
      const resp = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const sortedCustoms = productCustomRows.filter(x => x.beforeRowIndex !== undefined).sort((a, b) => (a.beforeRowIndex ?? 0) - (b.beforeRowIndex ?? 0));
  const legacyCustoms = productCustomRows.filter(x => x.beforeRowIndex === undefined);

  const makeRowData = (item: InvoiceItem | null, label: string, amount: string, n: string | number): (string | number)[] =>
    mergedCols.map(col => {
      if (col.type !== 'fixed') return item && col.type === 'custom' ? (customColumnValues[item.id]?.[col.col.id] || '') : '';
      switch (col.idx) {
        case 0: return n;
        case 1: return label || (item ? item.SKU : '');
        case 2: return '';
        case 3: return label ? (item ? '' : label) : (item ? item.Name : '');
        case 4: return item ? item.quantity : '';
        case 5: return item && item.Unit ? item.Unit : '/';
        case 6: return item ? fmt(item.selectedPrice, info.currency) : '';
        case 7: return amount || (item ? fmt(item.total, info.currency) : '');
      }
      return '';
    });

  const bodyRows: Array<{ data: (string | number)[] }> = [];
  let ci = 0;
  for (let i = 0; i <= items.length; i++) {
    while (ci < sortedCustoms.length && (sortedCustoms[ci].beforeRowIndex ?? 0) <= i) {
      const row = sortedCustoms[ci];
      bodyRows.push({ data: makeRowData(null, row.label, fmt(parseFloat(row.value) || 0, info.currency), '') });
      ci++;
    }
    if (i < items.length) bodyRows.push({ data: makeRowData(items[i], '', '', i + 1) });
  }
  while (ci < sortedCustoms.length) {
    const row = sortedCustoms[ci];
    bodyRows.push({ data: makeRowData(null, row.label, fmt(parseFloat(row.value) || 0, info.currency), '') });
    ci++;
  }
  for (const row of legacyCustoms) {
    bodyRows.push({ data: makeRowData(null, row.label, fmt(parseFloat(row.value) || 0, info.currency), '') });
  }

  // Fetch product images in parallel
  const imageFetchPromises = items.map(item => item.Image ? getBase64Image(item.Image) : Promise.resolve(null));
  const imageResults = await Promise.all(imageFetchPromises);
  const imageRowMap = new Map<number, string>(); // bodyRows index → base64
  let bodyIdx = 0;
  ci = 0;
  for (let i = 0; i <= items.length; i++) {
    while (ci < sortedCustoms.length && (sortedCustoms[ci].beforeRowIndex ?? 0) <= i) { bodyIdx++; ci++; }
    if (i < items.length) {
      if (imageResults[i]) imageRowMap.set(bodyIdx, imageResults[i]!);
      bodyIdx++;
    }
  }

  const picColIdx = mergedCols.findIndex(c => c.type === 'fixed' && c.idx === 2);
  const productCustomTotal = productCustomRows.reduce((s, x) => s + (parseFloat(x.value) || 0), 0);
  const subTotal = items.reduce((s, it) => s + it.total, 0) + productCustomTotal;
  const grandTotal = subTotal + fees.shippingCost + fees.handlingFee + fees.tax;

  for (let bi = 0; bi < bodyRows.length; bi++) {
    const rowData = bodyRows[bi];
    const hasImage = imageRowMap.has(bi);
    for (let ci = 0; ci < tCols; ci++) {
      const col = mergedCols[ci];
      const val = rowData.data[ci] ?? '';
      let align: 'left' | 'center' | 'right' = 'left';
      let bold = false;
      if (col.type === 'fixed') {
        if ([0, 2, 4, 5].includes(col.idx)) align = 'center';
        if (col.idx === 1) { align = 'center'; bold = true; }
        if ([6, 7].includes(col.idx)) { align = 'right'; bold = true; }
      } else align = 'center';
      cell(r, ci + 1, val, { sz: 9, align, bold });
    }
    h(r, hasImage ? 50 : 30);
    r++;
  }

  // Place images in Picture column cells with aspect-ratio preservation
  const getImgDimensions = (b64: string): Promise<{ w: number; h: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = b64;
    });
  };

  // Picture column width (18 chars × ~7px/char) determines image width
  const colPx = Math.round(fixedWidths[2] * 7);
  const rowPx = 60;
  const pad = 4;
  for (const [bIdx, b64] of imageRowMap) {
    const rowNum = headerRow + 1 + bIdx;
    try {
      const dims = await getImgDimensions(b64);
      if (!dims || dims.w <= 0 || dims.h <= 0) continue;
      let imgW: number, imgH: number;
      const ratio = dims.w / dims.h;
      const maxW = colPx - pad * 2;
      const maxH = rowPx - pad * 2;
      if (maxW / ratio <= maxH) {
        imgW = maxW;
        imgH = maxW / ratio;
      } else {
        imgH = maxH;
        imgW = maxH * ratio;
      }
      const extMatch = b64.match(/^data:image\/(\w+);base64,/);
      const ext = extMatch && extMatch[1] === 'png' ? 'png' : 'jpeg';
      const imgId = wb.addImage({ base64: b64, extension: ext } as any);
      const ox = Math.max(0, Math.round((colPx - imgW) / 2));
      const oy = Math.max(0, Math.round((rowPx - imgH) / 2));
      ws.addImage(imgId as any, {
        tl: { col: picColIdx, row: rowNum - 1, dx: ox, dy: oy },
        ext: { width: Math.round(imgW), height: Math.round(imgH) },
      } as any);
    } catch (e) { /* skip failed image */ }
  }

  // Summary rows
  const sumRow = (label: string, amount: string, isTotal: boolean) => {
    for (let ci = 0; ci < tCols; ci++) {
      const col = mergedCols[ci];
      let val = '';
      let a: 'left' | 'center' | 'right' = 'left';
      if (col.type === 'fixed') {
        if (col.idx === 1) { val = label; a = 'left'; }
        if (col.idx === 3 && label === 'TOTAL') { val = `TOTAL (${info.currency})`; a = 'right'; }
        if (col.idx === 7) { val = amount; a = 'right'; }
      }
      cell(r, ci + 1, val, {
        bold: true, sz: 9, align: a,
        fill: isTotal ? 'FFF8FAFC' : undefined,
        color: isTotal ? 'FFDC2626' : undefined,
      });
    }
    h(r, 22); r++;
  };

  sumRow('Shipping Cost', fmt(fees.shippingCost, info.currency), false);
  sumRow('Handing Fee', fmt(fees.handlingFee, info.currency), false);
  sumRow('TOTAL', fmt(grandTotal, info.currency), true);

  r++;

  // ============================================================
  // 5. REMARKS
  // ============================================================
  merge(r, 1, r, tCols, 'REMARK:', { bold: true, sz: 9, color: 'FFFF0000' });
  h(r, 20); r++;

  const remarkData: [string, string][] = [
    ['SHIPPING DAY:', remarks.shippingDay],
    ['WARRANTY:', remarks.warranty],
    ['PACKING:', remarks.packing],
    ['SHIPMENT:', `FROM GUANGZHOU TO ${remarks.shipmentTo}`],
  ];
  for (const [label, val] of remarkData) {
    cell(r, 1, label, { bold: true, sz: 9, align: 'left' });
    merge(r, 2, r, tCols, val, { sz: 9, align: 'left' });
    h(r, 20); r++;
  }

  r++;

  // ============================================================
  // 6. PAYPAL
  // ============================================================
  merge(r, 1, r, tCols, 'PAYPAL INFORMATION', { bold: true, sz: 10, color: 'FF2563EB', align: 'left' });
  h(r, 22); r++;

  cell(r, 1, 'ACCOUNT NAME:', { bold: true, sz: 10, align: 'right' });
  merge(r, 2, r, tCols, bank.paypalAccount, { bold: true, sz: 12, align: 'center' });
  h(r, 26); r++;

  r++;

  // ============================================================
  // 7. BANK
  // ============================================================
  merge(r, 1, r, tCols, 'BANK INFORMATION', { bold: true, sz: 10, color: 'FF2563EB', align: 'left' });
  h(r, 22); r++;

  const bankRows: [string, string][] = [
    ['ACCOUNT NAME:', bank.accountName],
    ['ACCOUNT ADDRESS:', bank.accountAddress],
    ['BENEFICIARY BANK:', bank.beneficiaryBank],
    ['BANK ADDRESS:', bank.bankAddress],
    ['ACCOUNT NUMBER:', bank.accountNumber],
    ['SWIFT CODE:', bank.swiftCode],
  ];
  for (const [label, val] of bankRows) {
    cell(r, 1, label, { bold: true, sz: 9, align: 'right' });
    merge(r, 2, r, tCols, val, { bold: true, sz: 9, align: 'left' });
    h(r, 22); r++;
  }

  r++;

  // ============================================================
  // 8. DISCLAIMER
  // ============================================================
  const disclaimer = (text: string) => {
    merge(r, 1, r, tCols, text, { sz: 8, fontColor: 'FF64748B', align: 'left' });
    ws.getCell(r, 1).font = { italic: true, size: 8, color: { argb: 'FF64748B' }, name: 'Helvetica' };
    ws.getCell(r, 1).border = borderBottom;
    h(r, 18); r++;
  };
  disclaimer('* Please check the items and quantity carefully after receiving the proforma invoice.');
  disclaimer('Any discrepancies should be reported within 3 working days.');

  // ── Write ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PI_${info.invoiceNo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
