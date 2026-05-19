/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Search, Loader2, Plus, X } from 'lucide-react';
import { Product } from '../types';
import { fetchProducts } from '../services/productService';

interface ProductSearchProps {
  onAddProduct: (product: Product) => void;
  onRequestManualAdd?: () => void;
}

const ALL = '___ALL___';

export const ProductSearch: React.FC<ProductSearchProps> = ({ onAddProduct, onRequestManualAdd }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data.filter(p => p.SKU));
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.Category) cats.add(p.Category); });
    return Array.from(cats).sort();
  }, [products]);

  const categoryFiltered = useMemo(() => {
    if (selectedCategory === ALL) return products;
    return products.filter(p => p.Category === selectedCategory);
  }, [products, selectedCategory]);

  const fuse = useMemo(() => new Fuse(categoryFiltered, {
    keys: ['SKU', 'Name'],
    threshold: 0.3,
  }), [categoryFiltered]);

  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = fuse.search(query).map(r => r.item);
      setResults(searchResults.slice(0, 10));
      setShowDropdown(true);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query, fuse]);

  const handleSelect = (product: Product) => {
    onAddProduct(product);
    setQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="relative mb-0 z-40">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? "Loading..." : "SKU or Name..."}
          disabled={loading}
          className="block w-full pl-9 pr-3 py-2 border-none bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(ALL)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
              selectedCategory === ALL
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? ALL : cat)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer truncate max-w-[120px] ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <div className="absolute mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200 left-0">
          {results.map((product) => (
            <button
              key={`${product.SKU}-${product.Name}`}
              onClick={() => handleSelect(product)}
              className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors group"
            >
              {product.Image && (
                <img 
                  src={product.Image} 
                  alt={product.Name} 
                  className="w-10 h-10 object-cover rounded bg-slate-100 shrink-0 border border-slate-100"
                  onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate tracking-tight">
                  {product.SKU}
                </p>
                <p className="text-[10px] text-slate-500 truncate font-medium">{product.Name}</p>
                {product.Category && (
                  <p className="text-[9px] text-amber-600 font-medium mt-0.5">{product.Category}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-blue-600 tracking-tighter">${product.Price_1_20}</p>
                <Plus className="h-3 h-3 text-slate-300 group-hover:text-blue-500 transition-colors ml-auto" />
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && query.length >= 2 && (
        <div className="absolute mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-center">
          <p className="text-slate-400 text-xs mb-2">Not found "{query}"</p>
          {onRequestManualAdd && (
            <button
              onClick={() => { onRequestManualAdd(); setQuery(''); setShowDropdown(false); }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              + Add Manually
            </button>
          )}
        </div>
      )}
    </div>
  );
};