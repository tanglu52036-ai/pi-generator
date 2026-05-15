/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BankInfo } from '../types';

interface BankFormProps {
  bank: BankInfo;
  onUpdate: (bank: BankInfo) => void;
}

export const BankForm: React.FC<BankFormProps> = ({ bank, onUpdate }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onUpdate({ ...bank, [name]: value });
  };

  const inputClass = "w-full border-slate-200 border rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-blue-500 bg-white transition-all";

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-1">Bank Transfer Info</h4>
        <input
          type="text"
          name="accountName"
          value={bank.accountName}
          onChange={handleChange}
          placeholder="Account Name"
          className={inputClass}
        />
        <textarea
          name="accountAddress"
          value={bank.accountAddress}
          onChange={handleChange}
          placeholder="Account Address"
          rows={2}
          className={inputClass}
        />
        <input
          type="text"
          name="beneficiaryBank"
          value={bank.beneficiaryBank}
          onChange={handleChange}
          placeholder="Beneficiary Bank"
          className={inputClass}
        />
        <textarea
          name="bankAddress"
          value={bank.bankAddress}
          onChange={handleChange}
          placeholder="Bank Address"
          rows={2}
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            name="accountNumber"
            value={bank.accountNumber}
            onChange={handleChange}
            placeholder="Account Number"
            className={inputClass}
          />
          <input
            type="text"
            name="swiftCode"
            value={bank.swiftCode}
            onChange={handleChange}
            placeholder="SWIFT Code"
            className={inputClass}
          />
        </div>
        
        <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-1 pt-2">PayPal Info</h4>
        <input
          type="email"
          name="paypalAccount"
          value={bank.paypalAccount}
          onChange={handleChange}
          placeholder="PayPal Account Name (Email)"
          className={inputClass}
        />
      </div>
    </div>
  );
};
