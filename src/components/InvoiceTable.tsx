/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2, Minus, Plus, Image as ImageIcon } from 'lucide-react';
import { InvoiceItem } from '../types';

interface InvoiceTableProps {
  items: InvoiceItem[];
  onUpdateQuantity: (sku: string, quantity: number) => void;
  onRemoveItem: (sku: string) => void;
  minimal?: boolean;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem,
  minimal = false
}) => {
  const subTotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="mb-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-y border-slate-900/5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <th className="py-4 px-2">SKU / Description</th>
              <th className="py-4 text-center w-24">Qty</th>
              <th className="py-4 text-right w-32">Unit Price</th>
              <th className="py-4 text-right w-32 pr-2">Amount</th>
              {!minimal && <th className="py-4 w-10"></th>}
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={minimal ? 4 : 5} className="py-20 text-center text-slate-300 italic uppercase tracking-widest text-[10px]">
                  No items added to invoice
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.SKU} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-5 px-2">
                    <div className="flex gap-3 items-center text-left">
                      {item.Image && (
                        <img src={item.Image} alt="" className="w-10 h-10 object-cover rounded shrink-0 border border-slate-100" />
                      )}
                      <div>
                        <div className="font-black text-slate-900 tracking-tight">{item.SKU}</div>
                        <div className="text-slate-400 text-[10px] font-medium leading-tight line-clamp-1">{item.Name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 text-center">
                    <div className="inline-flex items-center gap-2 bg-slate-100 rounded-md p-1 group-hover:bg-white border border-transparent group-hover:border-slate-200 transition-all">
                      <button onClick={() => onUpdateQuantity(item.SKU, item.quantity - 1)} className="p-0.5 hover:text-blue-600 transition-colors cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <span className="w-6 font-bold text-slate-900 text-[11px]">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.SKU, item.quantity + 1)} className="p-0.5 hover:text-blue-600 transition-colors cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                  </td>
                  <td className="py-5 text-right font-bold text-slate-900">
                    ${item.selectedPrice.toFixed(2)}
                  </td>
                  <td className="py-5 text-right font-black text-slate-900 pr-2">
                    ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {!minimal && (
                    <td className="py-5 text-right">
                      <button 
                        onClick={() => onRemoveItem(item.SKU)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-500 text-slate-300 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
