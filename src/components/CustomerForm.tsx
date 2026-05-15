/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Customer } from '../types';

interface CustomerFormProps {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
  invoiceNo: string;
  date: string;
  payment: string;
  onUpdateInfo: (field: string, value: string) => void;
  compact?: boolean;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ 
  customer, 
  onUpdate, 
  invoiceNo, 
  date, 
  payment,
  onUpdateInfo,
  compact = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onUpdate({ ...customer, [name]: value });
  };

  const inputClass = "w-full border-slate-200 border rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-blue-500 bg-white transition-all";

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <input
          type="text"
          name="companyName"
          value={customer.companyName}
          onChange={handleChange}
          placeholder="Company Name"
          className={inputClass}
        />
        <input
          type="text"
          name="contact"
          value={customer.contact}
          onChange={handleChange}
          placeholder="Contact Person"
          className={inputClass}
        />
        <input
          type="email"
          name="email"
          value={customer.email}
          onChange={handleChange}
          placeholder="Contact Email"
          className={inputClass}
        />
        <textarea
          name="address"
          value={customer.address}
          onChange={handleChange}
          placeholder="Shipping Address"
          rows={3}
          className={cn(inputClass, "h-24 resize-none")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-100">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Invoice Info</label>
          <div className="space-y-2">
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => onUpdateInfo('invoiceNo', e.target.value)}
              className={cn(inputClass, "font-bold text-blue-600 bg-blue-50 border-blue-100")}
              placeholder="Invoice No"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => onUpdateInfo('date', e.target.value)}
              className={inputClass}
            />
            <select
              value={['Bank Transfer', 'Paypal'].includes(payment) ? payment : 'Other'}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'Other') onUpdateInfo('payment', val);
              }}
              className={inputClass}
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Paypal">Paypal</option>
              <option value="Other">Other...</option>
            </select>
            {(!['Bank Transfer', 'Paypal'].includes(payment) || payment === 'Other') && (
              <input
                type="text"
                value={payment === 'Other' ? '' : payment}
                onChange={(e) => onUpdateInfo('payment', e.target.value)}
                placeholder="Specify Other Payment Method"
                className={inputClass}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Add import for cn if not present
import { cn } from '../lib/utils';
