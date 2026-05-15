/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

interface LogoUploadProps {
  logo: string;
  onUpload: (url: string) => void;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({ logo, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company Logo</label>
      <div className="flex items-center gap-4">
        {logo ? (
          <div className="relative group">
            <img src={logo} alt="Logo" className="w-16 h-16 object-contain border border-slate-200 rounded p-1 bg-white" />
            <button 
              onClick={() => onUpload('')}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 border-2 border-dashed border-slate-200 rounded flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-400 hover:text-blue-500"
          >
            <Upload className="w-5 h-5 mb-1" />
            <span className="text-[8px] font-bold">UPLOAD</span>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <div className="text-[10px] text-slate-400 max-w-[120px]">
          Upload your company logo (PNG/JPG recommended)
        </div>
      </div>
    </div>
  );
};
