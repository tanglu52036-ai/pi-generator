/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SellerInfo } from '../types';
import { LogoUpload } from './LogoUpload';

interface SellerFormProps {
  seller: SellerInfo;
  onUpdate: (seller: SellerInfo) => void;
}

export const SellerForm: React.FC<SellerFormProps> = ({ seller, onUpdate }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onUpdate({ ...seller, [name]: value });
  };

  const inputClass = "w-full border-slate-200 border rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-blue-500 bg-white transition-all";

  return (
    <div className="space-y-4">
      <LogoUpload 
        logo={seller.logo} 
        onUpload={(url) => onUpdate({ ...seller, logo: url })} 
      />
      
      <div className="space-y-3">
        <input
          type="text"
          name="companyName"
          value={seller.companyName}
          onChange={handleChange}
          placeholder="Seller Company Name"
          className={inputClass}
        />
        <textarea
          name="officeAdd"
          value={seller.officeAdd}
          onChange={handleChange}
          placeholder="Office Address"
          rows={2}
          className={inputClass}
        />
        <textarea
          name="factoryAdd"
          value={seller.factoryAdd}
          onChange={handleChange}
          placeholder="Factory Address"
          rows={2}
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            name="tel"
            value={seller.tel}
            onChange={handleChange}
            placeholder="Tel"
            className={inputClass}
          />
          <input
            type="text"
            name="fax"
            value={seller.fax}
            onChange={handleChange}
            placeholder="Fax"
            className={inputClass}
          />
        </div>
        <input
          type="email"
          name="email"
          value={seller.email}
          onChange={handleChange}
          placeholder="Email"
          className={inputClass}
        />
        <input
          type="text"
          name="web"
          value={seller.web}
          onChange={handleChange}
          placeholder="Website"
          className={inputClass}
        />
      </div>
    </div>
  );
};
