/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, type DragEvent, type ReactNode } from 'react';
import {
  X, Plus, Loader2, Check, AlertCircle, ImageIcon,
  Search, Edit3, Save, RefreshCw, Package, Upload, Trash2,
} from 'lucide-react';
import { Product } from '../types';
import { initGoogleSheetsClient, fetchAllProducts, addProductRow, updateProductRow, deleteProductBySKU } from '../services/googleSheetsService';
import { uploadToPostImages } from '../services/imageUploadService';
import { LogoutButton } from './PasswordGate';

interface ProductManagerProps {
  onClose: () => void;
}

type ProductWithRow = Product & { rowIndex: number };

const EMPTY_PRODUCT: Product = {
  SKU: '',
  Name: '',
  Agent_Price: '',
  Price_1_20: '',
  Price_21_100: '',
  Price_101_300: '',
  Unit: 'pcs',
  Image: '',
  Category: '',
  Weight: '',
  Box_Size: '',
  Carton_Size: '',
  Carton_Weight: '',
};

type Tab = 'list' | 'add' | 'backfill';

export const ProductManager = ({ onClose }: ProductManagerProps) => {
  const [tab, setTab] = useState<Tab>('list');
  const [products, setProducts] = useState<ProductWithRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<Product>({ ...EMPTY_PRODUCT });
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [backfillPreview, setBackfillPreview] = useState<Record<string, string>>({});
  const [backfillStatus, setBackfillStatus] = useState<Record<string, 'uploading' | 'writing' | 'done' | 'error'>>({});

  const formRef = useRef<HTMLDivElement>(null);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    initGoogleSheetsClient().catch(() => {});
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchAllProducts();
      setProducts(data.filter(p => p.SKU));
    } catch (err: any) {
      console.error('[PM] loadProducts error:', err);
      const msg = err?.message || String(err);
      showMsg('error', msg.includes('403') ? 'Access denied — share the Sheet with the Service Account' : `Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const filtered = search
    ? products.filter(p =>
        p.SKU.toLowerCase().includes(search.toLowerCase()) ||
        p.Name.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const productsWithoutImage = products.filter(p => !p.Image);

  const resetForm = () => {
    setForm({ ...EMPTY_PRODUCT });
    setEditingRow(null);
    setImagePreview('');
  };

  const startEdit = (p: ProductWithRow) => {
    setForm({
      SKU: p.SKU,
      Name: p.Name,
      Agent_Price: p.Agent_Price,
      Price_1_20: p.Price_1_20,
      Price_21_100: p.Price_21_100,
      Price_101_300: p.Price_101_300,
      Unit: p.Unit,
      Image: p.Image,
      Category: p.Category,
      Weight: p.Weight,
      Box_Size: p.Box_Size,
      Carton_Size: p.Carton_Size,
      Carton_Weight: p.Carton_Weight,
    });
    setEditingRow(p.rowIndex);
    setImagePreview(p.Image || '');
    setTab('add');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleImagePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          setImagePreview(base64);
          setUploading(true);

          const url = await uploadToPostImages(blob, `product_${Date.now()}.png`);
          if (url) {
            setForm(prev => ({ ...prev, Image: url }));
            setImagePreview(url);
            showMsg('success', 'Image uploaded');
          } else {
            setForm(prev => ({ ...prev, Image: base64 }));
            showMsg('error', 'Upload failed, using local image');
          }
          setUploading(false);
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (tab === 'add') handleImagePaste(e);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [tab, handleImagePaste]);

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
      setUploading(true);

      const url = await uploadToPostImages(file, `product_${Date.now()}.png`);
      if (url) {
        setForm(prev => ({ ...prev, Image: url }));
        setImagePreview(url);
        showMsg('success', 'Image uploaded');
      } else {
        setForm(prev => ({ ...prev, Image: base64 }));
        showMsg('error', 'Upload failed, using local image');
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.SKU.trim() || !form.Name.trim()) {
      showMsg('error', 'SKU and Name are required');
      return;
    }

    setSaving(true);
    let ok = false;

    if (editingRow) {
      ok = await updateProductRow(editingRow, form);
    } else {
      ok = await addProductRow(form);
    }

    if (ok) {
      showMsg('success', editingRow ? 'Product updated' : 'Product added');
      resetForm();
      await loadProducts();
    } else {
      showMsg('error', 'Failed to save to Google Sheets');
    }
    setSaving(false);
  };

  const handleDelete = async (sku: string) => {
    if (!confirm(`Delete product "${sku}"? This will clear the row in Google Sheets.`)) return;
    const ok = await deleteProductBySKU(sku);
    if (ok) {
      showMsg('success', `Deleted ${sku}`);
      await loadProducts();
    } else {
      showMsg('error', 'Failed to delete product');
    }
  };

  const handleBackfillPaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;

          for (const p of productsWithoutImage.slice(0, 1)) {
            setBackfillPreview(prev => ({ ...prev, [p.SKU]: base64 }));
            setBackfillStatus(prev => ({ ...prev, [p.SKU]: 'uploading' }));

            const url = await uploadToPostImages(blob, `backfill_${p.SKU}_${Date.now()}.png`);
            if (!url) {
              console.error('[PM] Backfill upload failed for', p.SKU);
              setBackfillStatus(prev => ({ ...prev, [p.SKU]: 'error' }));
              continue;
            }

            setBackfillStatus(prev => ({ ...prev, [p.SKU]: 'writing' }));
            const written = await updateProductRow(p.rowIndex, { ...p, Image: url });

            if (written) {
              setBackfillStatus(prev => ({ ...prev, [p.SKU]: 'done' }));
              setBackfillPreview(prev => ({ ...prev, [p.SKU]: url }));
              showMsg('success', `Image updated for ${p.SKU}`);
              await loadProducts();
            } else {
              console.error('[PM] Backfill write failed for', p.SKU, 'row', p.rowIndex);
              setBackfillStatus(prev => ({ ...prev, [p.SKU]: 'error' }));
            }
          }
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
  }, [productsWithoutImage]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (tab === 'backfill') handleBackfillPaste(e);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [tab, handleBackfillPaste]);

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: ReactNode; text: string; cls: string }> = {
      uploading: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Uploading', cls: 'bg-blue-50 text-blue-700' },
      writing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Writing', cls: 'bg-blue-50 text-blue-700' },
      done: { icon: <Check className="w-3 h-3" />, text: 'Done', cls: 'bg-emerald-50 text-emerald-700' },
      error: { icon: <AlertCircle className="w-3 h-3" />, text: 'Failed', cls: 'bg-red-50 text-red-600' },
    };
    const s = map[status];
    if (!s) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${s.cls}`}>
        {s.icon}{s.text}
      </span>
    );
  };

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'list', label: 'Products', icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'add', label: editingRow ? 'Edit' : 'Add New', icon: <Plus className="w-3.5 h-3.5" /> },
    { key: 'backfill', label: `Backfill (${productsWithoutImage.length})`, icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-40 flex bg-slate-100">
      <div className="flex flex-col flex-1 max-w-7xl mx-auto w-full">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-600" />
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">Product Manager</h1>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton />
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {message && (
          <div className={`px-6 py-2 text-xs font-medium text-center ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-200'
              : 'bg-red-50 text-red-600 border-b border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <nav className="bg-white border-b border-slate-200 px-6 flex gap-1 shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU or name..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button
              onClick={loadProducts}
              disabled={loading}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'list' && (
            loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map(p => (
                  <div
                    key={`${p.SKU}-${p.rowIndex}`}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    <div className="aspect-square bg-slate-50 flex items-center justify-center p-4 relative">
                      {p.Image ? (
                        <img src={p.Image} alt={p.SKU} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-slate-300" />
                      )}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 bg-white/90 rounded-lg shadow-sm text-slate-500 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.SKU)}
                          className="p-1.5 bg-white/90 rounded-lg shadow-sm text-slate-500 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 border-t border-slate-100">
                      <p className="text-xs font-black text-slate-900 truncate">{p.SKU}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.Name}</p>
                      {p.Category && <p className="text-[9px] text-amber-600 font-medium mt-0.5 truncate">{p.Category}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-bold text-blue-600">${p.Price_1_20}</span>
                        <span className="text-[10px] text-slate-400">{p.Unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'add' && (
            <div ref={formRef} className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                {editingRow ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingRow ? 'Edit Product' : 'Add New Product'}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SKU *</label>
                  <input type="text" value={form.SKU} onChange={e => setForm(p => ({ ...p, SKU: e.target.value }))}
                    disabled={!!editingRow}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name *</label>
                  <input type="text" value={form.Name} onChange={e => setForm(p => ({ ...p, Name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit</label>
                  <input type="text" value={form.Unit} onChange={e => setForm(p => ({ ...p, Unit: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agent Price</label>
                  <input type="text" value={form.Agent_Price} onChange={e => setForm(p => ({ ...p, Agent_Price: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price 1-20</label>
                  <input type="text" value={form.Price_1_20} onChange={e => setForm(p => ({ ...p, Price_1_20: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price 21-100</label>
                  <input type="text" value={form.Price_21_100} onChange={e => setForm(p => ({ ...p, Price_21_100: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price 101-300</label>
                  <input type="text" value={form.Price_101_300} onChange={e => setForm(p => ({ ...p, Price_101_300: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <input type="text" value={form.Category} onChange={e => setForm(p => ({ ...p, Category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-wider">Logistics Specs</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weight</label>
                    <input type="text" value={form.Weight} onChange={e => setForm(p => ({ ...p, Weight: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Box Size</label>
                    <input type="text" value={form.Box_Size} onChange={e => setForm(p => ({ ...p, Box_Size: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Carton Size</label>
                    <input type="text" value={form.Carton_Size} onChange={e => setForm(p => ({ ...p, Carton_Size: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Carton Weight</label>
                    <input type="text" value={form.Carton_Weight} onChange={e => setForm(p => ({ ...p, Carton_Weight: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Image <span className="text-slate-400 font-normal">— Ctrl+V paste or drag here</span>
                </label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">Uploading...</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="flex flex-col items-center gap-3">
                      <img src={imagePreview} alt="Preview" className="max-w-[200px] max-h-[200px] object-contain rounded-lg" />
                      <button
                        onClick={() => { setImagePreview(''); setForm(p => ({ ...p, Image: '' })); }}
                        className="text-[10px] text-slate-400 hover:text-red-500 font-medium cursor-pointer"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-300" />
                      <div className="text-center">
                        <p className="text-xs text-slate-500 font-medium">Ctrl+V to paste image</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">or drag &amp; drop here</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!form.SKU.trim() || !form.Name.trim() || saving || uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingRow ? 'Update Product' : 'Add to Google Sheets'}
                </button>
                <button
                  onClick={() => { resetForm(); setTab('list'); }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {tab === 'backfill' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">
                  {productsWithoutImage.length} product{productsWithoutImage.length !== 1 ? 's' : ''} without image
                </p>
                <p className="text-xs text-slate-500 mt-1">Ctrl+V to paste image for the first product in the list</p>
              </div>

              {productsWithoutImage.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">All products have images</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {productsWithoutImage.map(p => {
                    const preview = backfillPreview[p.SKU];
                    const status = backfillStatus[p.SKU];

                    return (
                      <div key={p.SKU} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                          {preview ? (
                            <img src={preview} alt={p.SKU} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                          )}
                        </div>
                        <p className="text-xs font-black text-slate-900 truncate">{p.SKU}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.Name}</p>
                        <div className="mt-2">{status ? statusBadge(status) : (
                          <span className="text-[10px] text-slate-400">Waiting for paste</span>
                        )}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};