/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Customer, InvoiceItem, InvoiceInfo, SellerInfo, Fees } from '../types';

export const exportToExcel = (
  customer: Customer,
  items: InvoiceItem[],
  info: InvoiceInfo,
  seller: SellerInfo,
  fees: Fees
) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal + fees.shippingCost + fees.handlingFee + fees.tax;

  // Header information
  const headerData = [
    ['PROFORMA INVOICE'],
    [],
    ['Seller Information', '', 'Buyer Information'],
    [`Company: ${seller.companyName}`, '', `Company: ${customer.companyName}`],
    [`Address: ${seller.officeAdd}`, '', `Address: ${customer.address}`],
    [`Tel: ${seller.tel}`, '', `Tel/Fax: ${customer.telFax}`],
    [`Email: ${seller.email}`, '', `Contact: ${customer.contact}`],
    [`Web: ${seller.web}`, '', `Email: ${customer.email}`],
    [],
    ['PI Details'],
    [`PI Number: ${info.invoiceNo}`],
    [`Date: ${info.date}`],
    [`Payment: ${info.payment}`],
    [],
    ['Items'],
    ['No.', 'SKU', 'Product Name', 'Quantity', 'Unit Price', 'Amount']
  ];

  // Item rows
  const itemRows = items.map((item, index) => [
    index + 1,
    item.SKU,
    item.Name,
    item.quantity,
    item.selectedPrice,
    item.total
  ]);

  // Totals
  const totalRows = [
    [],
    ['', '', '', '', 'Subtotal:', subtotal],
    ['', '', '', '', 'Shipping Cost:', fees.shippingCost],
    ['', '', '', '', 'Handling Fee:', fees.handlingFee],
    ['', '', '', '', 'Tax Amount:', fees.tax],
    ['', '', '', '', `Grand Total (${info.currency}):`, grandTotal]
  ];

  const worksheetData = [...headerData, ...itemRows, ...totalRows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No.
    { wch: 15 }, // SKU
    { wch: 50 }, // Product Name
    { wch: 10 }, // QTY
    { wch: 15 }, // Price
    { wch: 15 }  // Amount
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');

  XLSX.writeFile(workbook, `PI_${info.invoiceNo}.xlsx`);
};
