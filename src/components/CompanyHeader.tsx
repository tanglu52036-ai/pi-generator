/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mail, Globe, Phone, MapPin, Printer } from 'lucide-react';

import { SellerInfo } from '../types';

interface CompanyHeaderProps {
  seller: SellerInfo;
}

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({ seller }) => {
  return (
    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10 mb-2">
      <div className="flex gap-5">
        {seller.logo ? (
          <img src={seller.logo} alt="Logo" className="w-14 h-14 object-contain" />
        ) : (
          <div className="w-14 h-14 bg-slate-900 rounded-sm flex items-center justify-center text-white font-black text-2xl italic tracking-tighter">
            {seller.companyName.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900">{seller.companyName || 'Guangzhou LOYO Electronic Factory'}</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-1.5 font-bold">Automotive Lighting Specialists</p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Proforma Invoice</h2>
        <div className="h-1 w-12 bg-blue-600 ml-auto mt-2.5"></div>
      </div>
    </div>
  );
};
