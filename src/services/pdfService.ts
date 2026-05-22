/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, InvoiceItem, InvoiceInfo, SellerInfo, BankInfo, InvoiceRemarks, Fees } from '../types';

const formatCurrency = (amount: number, currency: string): string => {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === 'USD') return '$' + formatted;
  return formatted + ' ' + currency;
};

const getImageDimensions = (dataUrl: string): Promise<{ width: number, height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
};

const getBase64Image = async (url: string): Promise<{ data: string, format: string } | null> => {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  
  const isBase64 = url.startsWith('data:');
  if (isBase64) {
    const match = url.match(/^data:image\/(\w+);base64,/);
    const format = match ? match[1].toUpperCase() : 'JPEG';
    return { data: url, format };
  }

  const secureFetch = async (targetUrl: string, useProxy = false): Promise<Blob | null> => {
    try {
      const finalUrl = useProxy 
        ? `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` 
        : targetUrl;
      const response = await fetch(finalUrl, { mode: 'cors', cache: 'default' });
      if (response.ok) return await response.blob();
      return null;
    } catch (e) {
      return null;
    }
  };

  let blob = await secureFetch(url);
  
  if (!blob) {
    blob = await secureFetch(url, true);
  }

  if (blob) {
    let format = 'JPEG';
    if (blob.type.includes('png')) format = 'PNG';
    else if (blob.type.includes('webp')) format = 'WEBP';

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ data: reader.result as string, format });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ data: dataUrl, format: 'JPEG' });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export async function exportToPDF(
  invoiceInfo: InvoiceInfo,
  customer: Customer,
  seller: SellerInfo,
  bank: BankInfo,
  remarks: InvoiceRemarks,
  fees: Fees,
  items: InvoiceItem[],
  invoiceNumber: string,
  customColumns: { id: string; name: string; insertAfterFixedCol?: number }[] = [],
  customColumnValues: Record<string, Record<string, string>> = {},
  productCustomRows: { id: string; label: string; value: string; beforeRowIndex?: number }[] = [],
  merges: Record<string, Record<number, number>> = {},
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    const logoResult = await getBase64Image(seller.logo);
    const imagesResults = await Promise.all(items.map(item => getBase64Image(item.Image)));
    const imageDimensions = await Promise.all(
      imagesResults.map(res => res ? getImageDimensions(res.data) : Promise.resolve(null))
    );

    const drawLine = (x1: number, y1: number, x2: number, y2: number, width = 0.2) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(width);
      doc.line(x1, y1, x2, y2);
    };

    let currentY = margin;

    // 1. Header Box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin, currentY, contentWidth, 45);

    if (logoResult) {
      try {
        doc.addImage(logoResult.data, logoResult.format as any, margin + 2, currentY + 2, 20, 15, undefined, 'FAST');
      } catch (e) {}
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(seller.companyName, pageWidth / 2, currentY + 10, { align: 'center' });
    drawLine(margin, currentY + 18, margin + contentWidth, currentY + 18, 0.3);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const addLine = (label: string, value: string, y: number) => {
      doc.setFont('helvetica', 'bold');
      const labelWidth = doc.getTextWidth(label);
      const valueWidth = doc.getTextWidth(value);
      const startX = (pageWidth - (labelWidth + valueWidth + 2)) / 2;
      doc.text(label, startX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, startX + labelWidth + 1, y);
    };

    addLine('Office Add: ', seller.officeAdd, currentY + 22);
    drawLine(margin, currentY + 24, margin + contentWidth, currentY + 24, 0.2);
    addLine('Factory Add: ', seller.factoryAdd, currentY + 27);
    drawLine(margin, currentY + 29, margin + contentWidth, currentY + 29, 0.2);
    addLine('New Factory Add: ', seller.newFactoryAdd, currentY + 32);
    drawLine(margin, currentY + 34, margin + contentWidth, currentY + 34, 0.2);
    
    const contactText = `Tel: ${seller.tel}    Fax: ${seller.fax}    Email: ${seller.email}`;
    doc.setFont('helvetica', 'bold');
    doc.text(contactText, pageWidth / 2, currentY + 37, { align: 'center' });
    drawLine(margin, currentY + 39, margin + contentWidth, currentY + 39, 0.2);
    
    const webText = `Web: ${seller.web}`;
    doc.text(webText, pageWidth / 2, currentY + 42, { align: 'center' });

    currentY += 45;

    // 2. Title Bar
    doc.setFillColor(184, 204, 228);
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setDrawColor(0);
    doc.rect(margin, currentY, contentWidth, 8, 'D');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PROFORMA INVOICE', pageWidth / 2, currentY + 6, { align: 'center' });
    currentY += 8;

    // 3. Buyer's Information
    doc.setFontSize(10);
    doc.rect(margin, currentY, contentWidth, 5);
    doc.text("Buyer's information", margin + 2, currentY + 4);
    currentY += 5;

    const buyerLabels = [
      { l: 'Company Name:', v: customer.companyName },
      { l: 'Address:', v: customer.address, rows: 2 },
      { l: 'Telephone/Fax:', v: customer.telFax },
      { l: 'Contact:', v: customer.contact },
      { l: 'Email Address:', v: customer.email },
      { l: 'Invoice No.:', v: invoiceInfo.invoiceNo },
      { l: 'Date:', v: invoiceInfo.date },
      { l: 'payment:', v: invoiceInfo.payment }
    ];

    const labelColWidth = 45;
    doc.setFontSize(9);
    const buyerLineH = doc.getTextDimensions('T').h * 1.15;
    buyerLabels.forEach((item) => {
      const valueLines = doc.splitTextToSize(item.v, contentWidth - labelColWidth - 5);
      const textBlockHeight = valueLines.length > 1 ? (valueLines.length - 1) * buyerLineH : 0;
      const rowHeight = Math.max(7, textBlockHeight + doc.getTextDimensions('T').h + 3);
      doc.rect(margin, currentY, contentWidth, rowHeight);
      doc.rect(margin, currentY, labelColWidth, rowHeight);
      
      doc.setFont('helvetica', 'bold');
      doc.text(item.l, margin + labelColWidth - 2, currentY + (rowHeight / 2) + 1, { align: 'right' });
      
      doc.setFont('helvetica', item.l === 'Company Name:' || item.l === 'payment:' ? 'bold' : 'normal');
      doc.text(valueLines, margin + labelColWidth + 2, currentY + (rowHeight / 2) - (textBlockHeight / 2) + 1);
      
      currentY += rowHeight;
    });

    // 4. Product Table
    const productCustomRowsTotal = productCustomRows.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
    const itemsSubtotal = items.reduce((sum, item) => sum + item.total, 0) + productCustomRowsTotal;
    const totalAmount = itemsSubtotal + fees.shippingCost + fees.handlingFee + fees.tax;

    const buildMergedCols = (customs: typeof customColumns) => {
      const sorted = [...customs].sort((a, b) => (a.insertAfterFixedCol ?? 7) - (b.insertAfterFixedCol ?? 7));
      const result: Array<{ type: 'fixed'; idx: number } | { type: 'custom'; col: (typeof customs)[0] }> = [];
      for (const c of sorted) { if ((c.insertAfterFixedCol ?? 7) < 0) result.push({ type: 'custom', col: c }); }
      for (let f = 0; f < 8; f++) {
        result.push({ type: 'fixed', idx: f });
        for (const c of sorted) { if ((c.insertAfterFixedCol ?? 7) === f) result.push({ type: 'custom', col: c }); }
      }
      for (const c of sorted) { if ((c.insertAfterFixedCol ?? 7) >= 8) result.push({ type: 'custom', col: c }); }
      return result;
    };

    const mergedCols = buildMergedCols(customColumns);
    const mergedCount = mergedCols.length;

    const makeRow = (item: InvoiceItem | null, customLabel: string, customAmount: string, n: string | number): (string | number)[] => {
      return mergedCols.map(col => {
        if (col.type === 'fixed') {
          switch (col.idx) {
            case 0: return n;
            case 1: return customLabel || (item ? item.SKU : '');
            case 2: return '';
            case 3: return customLabel ? '' : (item ? item.Name : '');
            case 4: return item ? item.quantity : '';
            case 5: return item && item.Unit ? item.Unit : '/';
            case 6: return item ? formatCurrency(item.selectedPrice, invoiceInfo.currency) : '';
            case 7: return customAmount || (item ? formatCurrency(item.total, invoiceInfo.currency) : '');
          }
        }
        return item && col.type === 'custom' ? (customColumnValues[item.id]?.[col.col.id] || '') : '';
      });
    };

    const sortedCustoms = productCustomRows.filter(r => r.beforeRowIndex !== undefined).sort((a, b) => (a.beforeRowIndex ?? 0) - (b.beforeRowIndex ?? 0));
    const legacyCustoms = productCustomRows.filter(r => r.beforeRowIndex === undefined);
    const bodyData: (string | number)[][] = [];
    const bodyRowIds: string[] = [];
    let ci = 0;
    for (let i = 0; i <= items.length; i++) {
      while (ci < sortedCustoms.length && (sortedCustoms[ci].beforeRowIndex ?? 0) <= i) {
        const row = sortedCustoms[ci];
        bodyData.push(makeRow(null, row.label, formatCurrency(parseFloat(row.value) || 0, invoiceInfo.currency), ''));
        bodyRowIds.push(row.id);
        ci++;
      }
      if (i < items.length) {
        const item = items[i];
        bodyData.push(makeRow(item, '', '', i + 1));
        bodyRowIds.push(item.id);
      }
    }
    while (ci < sortedCustoms.length) {
      const row = sortedCustoms[ci];
      bodyData.push(makeRow(null, row.label, formatCurrency(parseFloat(row.value) || 0, invoiceInfo.currency), ''));
      bodyRowIds.push(row.id);
      ci++;
    }
    for (const row of legacyCustoms) {
      bodyData.push(makeRow(null, row.label, formatCurrency(parseFloat(row.value) || 0, invoiceInfo.currency), ''));
      bodyRowIds.push(row.id);
    }

    const summaryStartIndex = bodyData.length;

    const makeSummaryRow = (label: string, amount: string): (string | number)[] => {
      return mergedCols.map(col => {
        if (col.type === 'fixed') {
          if (col.idx === 1) return label;
          if (col.idx === 3 && label === 'TOTAL') return `TOTAL (${invoiceInfo.currency})`;
          if (col.idx === 7) return amount;
        }
        return '';
      });
    };

    bodyData.push(makeSummaryRow('Shipping Cost', formatCurrency(fees.shippingCost, invoiceInfo.currency)));
    bodyData.push(makeSummaryRow('Handing Fee', formatCurrency(fees.handlingFee, invoiceInfo.currency)));
    bodyData.push(makeSummaryRow('TOTAL', formatCurrency(totalAmount, invoiceInfo.currency)));

    const productImageMap = new Map<number, number>();
    let dataRowIdx = 0;
    let productIdx = 0;
    ci = 0;
    for (let i = 0; i <= items.length; i++) {
      while (ci < sortedCustoms.length && (sortedCustoms[ci].beforeRowIndex ?? 0) <= i) { dataRowIdx++; ci++; }
      if (i < items.length) { productImageMap.set(dataRowIdx, productIdx); dataRowIdx++; productIdx++; }
    }

    const fixedWidths = [8, 25, 35, 60, 10, 12, 20, 20];
    const customColWidth = 18;
    const totalContentWidth = 190;
    let totalRequested = 0;
    mergedCols.forEach(col => {
      totalRequested += col.type === 'fixed' ? fixedWidths[col.idx] : customColWidth;
    });
    const shrink = totalRequested > totalContentWidth ? totalContentWidth / totalRequested : 1;

    const columnStyles: Record<number, any> = {};
    mergedCols.forEach((col, i) => {
      if (col.type === 'fixed') {
        const base = fixedWidths[col.idx] * shrink;
        columnStyles[i] = { cellWidth: base };
        if (col.idx === 0) columnStyles[i].halign = 'center';
        if (col.idx === 1) { columnStyles[i].halign = 'center'; columnStyles[i].fontStyle = 'bold'; }
        if (col.idx === 2) { columnStyles[i].halign = 'center'; columnStyles[i].minCellHeight = 25; }
        if (col.idx === 4) columnStyles[i].halign = 'center';
        if (col.idx === 5) columnStyles[i].halign = 'center';
        if (col.idx === 6) columnStyles[i].halign = 'right';
        if (col.idx === 7) { columnStyles[i].halign = 'right'; columnStyles[i].fontStyle = 'bold'; }
      } else {
        columnStyles[i] = { cellWidth: customColWidth * shrink, halign: 'center' };
      }
    });

    const headRow = mergedCols.map(col => {
      const names: string[] = ['N', 'Model No', 'Picture', 'Description', 'QTY', 'Units', `Unit Price (${invoiceInfo.currency})`, `Amount(${invoiceInfo.currency})`];
      if (col.type === 'fixed') return names[col.idx] || '';
      return col.col.name;
    });

    const pictureVisIdx = mergedCols.findIndex(c => c.type === 'fixed' && c.idx === 2);

    autoTable(doc, {
      startY: currentY,
      head: [headRow],
      body: bodyData,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === pictureVisIdx) {
          const imgIdx = productImageMap.get(data.row.index);
          if (imgIdx !== undefined) {
            const res = imagesResults[imgIdx];
            const dims = imageDimensions[imgIdx];
            if (res && dims) {
              try {
                const padding = 4;
                const availableW = data.cell.width - padding;
                const availableH = data.cell.height - padding;

                const imgRatio = dims.width / dims.height;
                const cellRatio = availableW / availableH;

                let imgW: number, imgH: number;
                if (imgRatio > cellRatio) {
                  imgW = availableW;
                  imgH = availableW / imgRatio;
                } else {
                  imgH = availableH;
                  imgW = availableH * imgRatio;
                }

                const imgX = data.cell.x + (data.cell.width - imgW) / 2;
                const imgY = data.cell.y + (data.cell.height - imgH) / 2;

                doc.addImage(res.data, res.format as any, imgX, imgY, imgW, imgH, undefined, 'FAST');
              } catch (e) {}
            }
          }
        }
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fontSize: 8,
        textColor: [0, 0, 0],
        valign: 'middle',
        minCellHeight: 10
      },
      headStyles: {
        fillColor: [79, 129, 189],
        textColor: [255, 255, 255],
        halign: 'center'
      },
      columnStyles,
      didParseCell: (data) => {
        if (data.section === 'body') {
          const rowId = bodyRowIds[data.row.index];
          if (rowId && merges[rowId]) {
            const rowMerges = merges[rowId];
            if (rowMerges[data.column.index]) {
              (data.cell as any).colSpan = rowMerges[data.column.index];
            }
          }
        }
        if (data.row.index >= summaryStartIndex) {
           data.cell.styles.fontStyle = 'bold';
           data.cell.styles.minCellHeight = 7;
           if (data.section === 'body' && data.row.index === summaryStartIndex + 2) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fillColor = [248, 250, 252];
           }
        }
      },
      margin: { top: margin, left: margin, right: margin, bottom: 10 },
      theme: 'grid'
    });

    const lastAutoTable = (doc as any).lastAutoTable;
    currentY = lastAutoTable ? lastAutoTable.finalY : currentY;

    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = margin;
    }

    // 5. Remarks
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 0, 0);
    doc.text('REMARK:', margin, currentY + 3);
    doc.setTextColor(0, 0, 0);
    
    const drawRemarkLine = (label: string, value: string, y: number) => {
      doc.setFont('helvetica', 'bold');
      doc.rect(margin, y, contentWidth, 4);
      doc.text(label, margin + 15, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 45, y + 3);
    };

    drawRemarkLine('SHIPPING DAY:', remarks.shippingDay, currentY + 4);
    drawRemarkLine('WARRANTY:', remarks.warranty, currentY + 8);
    drawRemarkLine('PACKING:', remarks.packing, currentY + 12);
    drawRemarkLine('SHIPMENT:', `FROM GUANGZHOU TO ${remarks.shipmentTo}`, currentY + 16);
    
    currentY += 22;

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = margin;
    }

    // 6. PayPal Information
    doc.setDrawColor(0);
    doc.rect(margin, currentY, contentWidth, 5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 255);
    doc.text('PAYPAL INFORMATION', margin + 2, currentY + 4);
    currentY += 5;
    
    doc.setTextColor(0);
    doc.rect(margin, currentY, contentWidth, 8);
    doc.rect(margin, currentY, labelColWidth, 8);
    doc.text('ACCOUNT NAME:', margin + labelColWidth - 2, currentY + 5, { align: 'right' });
    doc.setFontSize(11);
    doc.text(bank.paypalAccount, margin + labelColWidth + 2, currentY + 5);
    currentY += 8;

    // 7. Bank Information
    doc.rect(margin, currentY, contentWidth, 5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 255);
    doc.text('BANK INFORMATION', margin + 2, currentY + 4);
    currentY += 5;

    const bankRows = [
      { l: 'ACCOUNT NAME:', v: bank.accountName },
      { l: 'ACCOUNT ADDRESS:', v: bank.accountAddress },
      { l: 'BENEFICIARY BANK:', v: bank.beneficiaryBank },
      { l: 'BANK ADDRESS:', v: bank.bankAddress },
      { l: 'ACCOUNT NUMBER:', v: bank.accountNumber },
      { l: 'SWIFT CODE:', v: bank.swiftCode }
    ];

    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const bankLabelWidth = 68;
    const lineHeight = doc.getTextDimensions('T').h * 1.15;
    bankRows.forEach((row) => {
      const valueWidth = contentWidth - bankLabelWidth - 5;
      const valueLines = doc.splitTextToSize(row.v, valueWidth);
      const textBlockHeight = valueLines.length > 1 ? (valueLines.length - 1) * lineHeight : 0;
      const rowHeight = Math.max(7, textBlockHeight + doc.getTextDimensions('T').h + 3);

      if (currentY + rowHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      doc.rect(margin, currentY, contentWidth, rowHeight);
      doc.rect(margin, currentY, bankLabelWidth, rowHeight);
      
      doc.text(row.l, margin + bankLabelWidth - 2, currentY + (rowHeight / 2) + 1, { align: 'right' });
      doc.text(valueLines, margin + bankLabelWidth + 2, currentY + (rowHeight / 2) - (textBlockHeight / 2) + 1);
      currentY += rowHeight;
    });

    // 8. Disclaimer
    currentY += 3;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(100, 116, 139);
    doc.text('* Please check the items and quantity carefully after receiving the proforma invoice.', margin, currentY);
    currentY += 3.5;
    doc.text('Any discrepancies should be reported within 3 working days.', margin, currentY);

    doc.save(`PI_${invoiceInfo.invoiceNo}.pdf`);
}