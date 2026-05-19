/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const serviceAccountKey = JSON.parse(import.meta.env.VITE_GOOGLE_CREDENTIALS || '{}');
import type { Product } from '../types';

const SPREADSHEET_ID = '1y95e1Aaca4u0LQSUALGyZH2auaKXF_Y2CVeaDHxjwhk';
const SHEET_NAME = "'Sheet 1'";
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let accessToken: string | null = null;
let tokenExpiry = 0;
let initialized = false;

async function pemToCryptoKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function base64URLEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function stringToBase64URL(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createJWT(sa: ServiceAccountKey): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: SCOPES.join(' '),
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = stringToBase64URL(JSON.stringify(header));
  const claimB64 = stringToBase64URL(JSON.stringify(claim));
  const signingInput = `${headerB64}.${claimB64}`;

  const key = await pemToCryptoKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64URLEncode(signature)}`;
}

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  const sa = serviceAccountKey as unknown as ServiceAccountKey;
  const jwt = await createJWT(sa);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[Sheets] Token error', response.status, errText);
    throw new Error(`Token error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return accessToken;
}

async function sheetsApi(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const response = await fetch(`${SHEETS_API}/${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[Sheets] API error', response.status, path, text);
    throw new Error(`Sheets API ${response.status}: ${text}`);
  }

  return response.json();
}

function productToRow(product: Product): string[] {
  return [
    product.SKU,
    product.Name,
    product.Agent_Price,
    product.Price_1_20,
    product.Price_21_100,
    product.Price_101_300,
    product.Unit,
    product.Image,
    product.Category,
    product.Weight,
    product.Box_Size,
    product.Carton_Size,
    product.Carton_Weight,
  ];
}

function rowToProduct(row: string[], rowIndex: number): Product & { rowIndex: number } {
  return {
    rowIndex,
    SKU: row[0]?.trim() || '',
    Name: row[1]?.trim() || '',
    Agent_Price: row[2]?.trim() || '',
    Price_1_20: row[3]?.trim() || '',
    Price_21_100: row[4]?.trim() || '',
    Price_101_300: row[5]?.trim() || '',
    Unit: row[6]?.trim() || '',
    Image: row[7]?.trim() || '',
    Category: row[8]?.trim() || '',
    Weight: row[9]?.trim() || '',
    Box_Size: row[10]?.trim() || '',
    Carton_Size: row[11]?.trim() || '',
    Carton_Weight: row[12]?.trim() || '',
  };
}

export const initGoogleSheetsClient = async (): Promise<void> => {
  const sa = serviceAccountKey as unknown as ServiceAccountKey;
  if (!sa.client_email || !sa.private_key) {
    throw new Error('Invalid service account configuration');
  }
  await getAccessToken();
  initialized = true;
};

export const getProducts = async (): Promise<(Product & { rowIndex: number })[]> => {
  if (!initialized) await initGoogleSheetsClient();

  try {
    const data = await sheetsApi(`${SPREADSHEET_ID}/values/${SHEET_NAME}!A:M`);
    const rows: string[][] = data.values || [];

    if (rows.length < 2) return [];

    return rows.slice(1).map((row, i) => rowToProduct(row, i + 2));
  } catch (error) {
    console.error('[Sheets] getProducts error:', error);
    throw error;
  }
};

export const addProduct = async (product: Product): Promise<boolean> => {
  if (!initialized) await initGoogleSheetsClient();

  try {
    await sheetsApi(`${SPREADSHEET_ID}/values/${SHEET_NAME}!A:M:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      body: JSON.stringify({
        values: [productToRow(product)],
      }),
    });
    return true;
  } catch (err) {
    console.error('[Sheets] addProduct error:', err);
    return false;
  }
};

export const updateProductBySKU = async (
  sku: string,
  data: Partial<Product>,
): Promise<boolean> => {
  if (!initialized) await initGoogleSheetsClient();

  try {
    const allData = await sheetsApi(
      `${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A`,
    );
    const rows: string[][] = allData.values || [];
    let targetRow = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]?.[0]?.trim() === sku) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) return false;

    const existingAll = await sheetsApi(
      `${SPREADSHEET_ID}/values/${SHEET_NAME}!A${targetRow}:M${targetRow}`,
    );
    const existing = existingAll.values?.[0] || ['', '', '', '', '', '', '', '', '', '', '', '', ''];

    const merged = [
      existing[0] || '',        // SKU unchanged
      data.Name ?? existing[1] ?? '',
      data.Agent_Price ?? existing[2] ?? '',
      data.Price_1_20 ?? existing[3] ?? '',
      data.Price_21_100 ?? existing[4] ?? '',
      data.Price_101_300 ?? existing[5] ?? '',
      data.Unit ?? existing[6] ?? '',
      data.Image ?? existing[7] ?? '',
      data.Category ?? existing[8] ?? '',
      data.Weight ?? existing[9] ?? '',
      data.Box_Size ?? existing[10] ?? '',
      data.Carton_Size ?? existing[11] ?? '',
      data.Carton_Weight ?? existing[12] ?? '',
    ];

    await sheetsApi(
      `${SPREADSHEET_ID}/values/${SHEET_NAME}!A${targetRow}:M${targetRow}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [merged] }),
      },
    );
    return true;
  } catch (err) {
    console.error('[Sheets] updateProductBySKU error:', err);
    return false;
  }
};

export const deleteProductBySKU = async (sku: string): Promise<boolean> => {
  if (!initialized) await initGoogleSheetsClient();

  try {
    const allData = await sheetsApi(
      `${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A`,
    );
    const rows: string[][] = allData.values || [];
    let targetRow = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]?.[0]?.trim() === sku) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) return false;

    await sheetsApi(
      `${SPREADSHEET_ID}/values/${SHEET_NAME}!A${targetRow}:M${targetRow}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [['', '', '', '', '', '', '', '', '', '', '', '', '']] }),
      },
    );
    return true;
  } catch (err) {
    console.error('[Sheets] deleteProductBySKU error:', err);
    return false;
  }
};

/** @deprecated — use getProducts */
export const fetchAllProducts = getProducts;

/** @deprecated — use addProduct */
export const addProductRow = addProduct;

/** Update Image field by SKU (convenience wrapper) */
export const updateImageUrl = async (
  sku: string,
  imageUrl: string,
): Promise<boolean> => {
  return updateProductBySKU(sku, { Image: imageUrl });
};

/** Update a product row at a specific row index */
export const updateProductRow = async (
  rowIndex: number,
  product: Product,
): Promise<boolean> => {
  if (!initialized) await initGoogleSheetsClient();

  try {
    await sheetsApi(
      `${SPREADSHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:M${rowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [productToRow(product)] }),
      },
    );
    return true;
  } catch (err) {
    console.error('[Sheets] updateProductRow error:', err);
    return false;
  }
};

/** @deprecated — no config needed with Service Account */
export const configureSheets = (_config?: unknown): void => {};