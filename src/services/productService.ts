/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Papa from 'papaparse';
import { Product } from '../types';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOpGcKJ8qNwVDppl2t98vKthvoV0c_LOtTK3x-kGKiqFSpUddih2WRkWCkjLfqgl6GhVYJLjDOPDmN/pub?output=csv';

export const fetchProducts = async (): Promise<Product[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(SHEET_CSV_URL, {
      download: true,
      header: true,
      complete: (results) => {
        resolve(results.data as Product[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

const cleanPrice = (val: string): number => {
  if (!val) return 0;
  // Remove currency symbols, commas, and whitespace
  const cleaned = val.replace(/[$,\s]/g, '');
  return parseFloat(cleaned) || 0;
};

export const getPriceForQuantity = (product: Product, quantity: number): number => {
  if (quantity >= 101) return cleanPrice(product.Price_101_300);
  if (quantity >= 21) return cleanPrice(product.Price_21_100);
  if (quantity >= 1) return cleanPrice(product.Price_1_20);
  return cleanPrice(product.Agent_Price);
};
