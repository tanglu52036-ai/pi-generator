/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  SKU: string;
  Name: string;
  Agent_Price: string;
  Price_1_20: string;
  Price_21_100: string;
  Price_101_300: string;
  Unit: string;
  Image: string;
}

export interface Customer {
  companyName: string;
  address: string;
  telFax: string;
  contact: string;
  email: string;
}

export interface SellerInfo {
  companyName: string;
  officeAdd: string;
  factoryAdd: string;
  newFactoryAdd: string;
  tel: string;
  fax: string;
  email: string;
  web: string;
  logo: string;
}

export interface BankInfo {
  accountName: string;
  accountAddress: string;
  beneficiaryBank: string;
  bankAddress: string;
  accountNumber: string;
  swiftCode: string;
  paypalAccount: string;
}

export interface InvoiceRemarks {
  shippingDay: string;
  warranty: string;
  packing: string;
  shipmentTo: string;
}

export interface Fees {
  shippingCost: number;
  tax: number;
  handlingFee: number;
}

export interface InvoiceItem extends Product {
  id: string;
  quantity: number;
  selectedPrice: number;
  total: number;
}

export interface InvoiceInfo {
  invoiceNo: string;
  date: string;
  payment: string;
  currency: string;
}
