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

export const generatePDF = async (
  customer: Customer,
  items: InvoiceItem[],
  info: InvoiceInfo,
  seller: SellerInfo,
  bank: BankInfo,
  remarks: InvoiceRemarks,
  fees: Fees
) => {
  try {
    const doc = new jsPDF();
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
      { l: 'Invoice No.:', v: info.invoiceNo },
      { l: 'Date:', v: info.date },
      { l: 'payment:', v: info.payment }
    ];

    const labelColWidth = 45;
    doc.setFontSize(9);
    buyerLabels.forEach((item) => {
      const rowHeight = item.rows ? item.rows * 6 : 6;
      doc.rect(margin, currentY, contentWidth, rowHeight);
      doc.rect(margin, currentY, labelColWidth, rowHeight);
      
      doc.setFont('helvetica', 'bold');
      doc.text(item.l, margin + labelColWidth - 2, currentY + (rowHeight / 2) + 1, { align: 'right' });
      
      doc.setFont('helvetica', item.l === 'Company Name:' || item.l === 'payment:' ? 'bold' : 'normal');
      const valueLines = doc.splitTextToSize(item.v, contentWidth - labelColWidth - 5);
      doc.text(valueLines, margin + labelColWidth + 2, currentY + (rowHeight / 2) + 1 - (valueLines.length > 1 ? 2 : 0));
      
      currentY += rowHeight;
    });

    // 4. Product Table
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0) + fees.shippingCost + fees.handlingFee + fees.tax;

    autoTable(doc, {
      startY: currentY,
      head: [['N', 'Model No', 'Picture', 'Description', 'QTY', 'Units', `Unit Price (${info.currency})`, `Amount(${info.currency})`]],
      body: [
        ...items.map((item, i) => [
          i + 1,
          item.SKU,
          '',
          item.Name,
          item.quantity,
          item.Unit || '/',
          formatCurrency(item.selectedPrice, info.currency),
          formatCurrency(item.total, info.currency)
        ]),
        ['', 'Shipping Cost', '', '', '', '', '', formatCurrency(fees.shippingCost, info.currency)],
        ['', 'Handing Fee', '', '', '', '', '', formatCurrency(fees.handlingFee, info.currency)],
        ['', 'TOTAL', '', `TOTAL (${info.currency})`, '', '', '', formatCurrency(totalAmount, info.currency)]
      ],
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 2 && data.row.index < items.length) {
          const res = imagesResults[data.row.index];
          const dims = imageDimensions[data.row.index];
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
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 35, minCellHeight: 25 },
        3: { cellWidth: 60 },
        4: { halign: 'center', cellWidth: 10 },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'right', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index >= items.length) {
           data.cell.styles.fontStyle = 'bold';
           data.cell.styles.minCellHeight = 7;
           if (data.section === 'body' && data.row.index === items.length + 2) {
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

    doc.save(`PI_${info.invoiceNo}.pdf`);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};