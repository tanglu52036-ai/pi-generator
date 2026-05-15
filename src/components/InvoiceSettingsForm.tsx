/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Fees, InvoiceRemarks } from '../types';

interface InvoiceSettingsFormProps {
  fees: Fees;
  onUpdateFees: (fees: Fees) => void;
  remarks: InvoiceRemarks;
  onUpdateRemarks: (remarks: InvoiceRemarks) => void;
}

export const InvoiceSettingsForm: React.FC<InvoiceSettingsFormProps> = ({ 
  fees, onUpdateFees, remarks, onUpdateRemarks 
}) => {
  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onUpdateFees({ ...fees, [name]: parseFloat(value) || 0 });
  };

  const handleRemarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onUpdateRemarks({ ...remarks, [name]: value });
  };

  const inputClass = "w-full border-slate-200 border rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-blue-500 bg-white transition-all";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-1">Additional Fees & Tax</h4>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Shipping Cost ($)</label>
            <input
              type="number"
              name="shippingCost"
              value={fees.shippingCost}
              onChange={handleFeeChange}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Handling Fee ($)</label>
            <input
              type="number"
              name="handlingFee"
              value={fees.handlingFee}
              onChange={handleFeeChange}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tax Amount ($)</label>
            <input
              type="number"
              name="tax"
              value={fees.tax}
              onChange={handleFeeChange}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-1">Invoice Remarks</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Shipping Day</label>
            <input
              type="text"
              name="shippingDay"
              value={remarks.shippingDay}
              onChange={handleRemarkChange}
              placeholder="e.g. 3-7 Days"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Warranty</label>
            <input
              type="text"
              name="warranty"
              value={remarks.warranty}
              onChange={handleRemarkChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Packing</label>
            <input
              type="text"
              name="packing"
              value={remarks.packing}
              onChange={handleRemarkChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Shipment To</label>
            <input
              type="text"
              name="shipmentTo"
              value={remarks.shipmentTo}
              onChange={handleRemarkChange}
              placeholder="Country/Region"
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
