/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Download, ShoppingBag, ImageIcon as ImageIconLucide, Trash2, ZoomIn, ZoomOut, Maximize, Plus } from 'lucide-react';
import { ProductSearch } from './components/ProductSearch';
import { Customer, InvoiceItem, Product, InvoiceInfo, SellerInfo, BankInfo, InvoiceRemarks, Fees } from './types';
import { getPriceForQuantity } from './services/productService';
import { generatePDF } from './services/pdfService';
import { exportToExcel } from './services/excelService';
import { cn } from './lib/utils';

// InlineInput 保持原有逻辑，优化边框显示
const InlineInput = ({ value, onChange, placeholder, className, rows = 1, maxLength }: any) => (
  rows > 1 ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className={cn("w-full bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 -mx-1 transition-all resize-none overflow-hidden font-inherit", className)}
      onInput={(e: any) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      }}
    />
  ) : (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={cn("w-full bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 -mx-1 transition-all font-inherit", className)}
    />
  )
);

interface CustomRow {
  id: string;
  label: string;
  value: string;
}

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function App() {
  const [customer, setCustomer] = useState<Customer>({
    companyName: 'BUYER COMPANY NAME',
    address: 'BUYER ADDRESS DETAILS',
    telFax: '001-123-4567',
    contact: 'NAME HERE',
    email: 'buyer@example.com',
  });

  const [seller, setSeller] = useState<SellerInfo>({
    companyName: 'Guangzhou LOYO Electronic Technology Co., Ltd.',
    officeAdd: '4th Floor, C03 building, Xinhai park, Jixiangzhuang, Yongping street, Baiyun District, Guangzhou, China',
    factoryAdd: '2nd-4th Floor, Building A, No. 1, Yiheng Road, North Qinghu Caotian Street, Junhe Street, Baiyun District, Guangzhou',
    newFactoryAdd: '2nd-4th Floor, Building 4, Fengxiang Industrial Park, No. 9 Nanxian Road, Jianggao Town, Baiyun District, Guangzhou, China',
    tel: '+1 702 954 2699',
    fax: '0086-020-37813115',
    email: 'mia_loyo@loyolight.com',
    web: 'http://www.loyolight.com',
    logo: 'https://www.loyolight.com/static/images/logo.png',
  });

  const [bank, setBank] = useState<BankInfo>({
    accountName: 'HONGKONG LOYO ELECTRONIC TECHNOLOGY LIMITED',
    accountAddress: 'ROOM 1, 16/F, EMPRESS PLAZA17-19 CHATHAM ROAD SOUTH TSIMSHA TSUI,KL',
    beneficiaryBank: 'HSBC',
    bankAddress: "1 Queen's Road Central, Hong Kong",
    accountNumber: '817-599897-838',
    swiftCode: 'HSBCHKHHHKH',
    paypalAccount: 'superlight2015@hotmail.com',
  });

  const [fees, setFees] = useState<Fees>({
    shippingCost: 0,
    tax: 0,
    handlingFee: 0,
  });

  const [remarks, setRemarks] = useState<InvoiceRemarks>({
    shippingDay: '7-10 DAYS',
    warranty: '1 YEAR WARRANTY',
    packing: 'STANDARD EXPORT CARTON BOX',
    shipmentTo: 'USA',
  });

  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>({
    invoiceNo: 'LY-' + new Date().getFullYear() + '-' + (Math.floor(Date.now() / 1000) % 10000).toString().padStart(4, '0'),
    date: new Date().toISOString().split('T')[0],
    payment: 'PayPal/Bank Transfer',
    currency: 'USD',
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [buyerCustomRows, setBuyerCustomRows] = useState<CustomRow[]>([]);
  const [remarkCustomRows, setRemarkCustomRows] = useState<CustomRow[]>([]);
  const [paypalCustomRows, setPaypalCustomRows] = useState<CustomRow[]>([]);
  const [bankCustomRows, setBankCustomRows] = useState<CustomRow[]>([]);
  const [scale, setScale] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);

  // 自动调整缩放以适应移动端宽度，并处理双指缩放
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) {
        const newScale = (window.innerWidth - 32) / 900;
        setScale(newScale);
      } else {
        setScale(1);
      }
    };

    let startDist = 0;
    let initialScale = 1;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        initialScale = scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        const ratio = currentDist / startDist;
        const newScale = Math.max(0.1, Math.min(3, initialScale * ratio));
        setScale(newScale);
      }
    };

    const handleTouchEnd = () => {
      startDist = 0;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    const main = mainRef.current;
    if (main) {
      main.addEventListener('touchstart', handleTouchStart, { passive: true });
      main.addEventListener('touchmove', handleTouchMove, { passive: false });
      main.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (main) {
        main.removeEventListener('touchstart', handleTouchStart);
        main.removeEventListener('touchmove', handleTouchMove);
        main.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, []); // 移除 scale 依赖项，防止频繁重绑事件

  const resetView = () => {
    const defaultScale = window.innerWidth < 900 ? (window.innerWidth - 32) / 900 : 1;
    setScale(defaultScale);
    setResetKey(prev => prev + 1);
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const q = Math.max(1, quantity);
          const selectedPrice = getPriceForQuantity(item, q);
          return {
            ...item,
            quantity: q,
            selectedPrice,
            total: q * selectedPrice,
          };
        }
        return item;
      })
    );
  };

  const addProduct = (product: Product) => {
    const quantity = 1;
    const selectedPrice = getPriceForQuantity(product, quantity);
    const newItem: InvoiceItem = {
      ...product,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      quantity,
      selectedPrice,
      total: quantity * selectedPrice,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemName = (id: string, newName: string) => {
    setItems(prevItems => 
      prevItems.map(item => item.id === id ? { ...item, Name: newName } : item)
    );
  };

  const updateItemPrice = (id: string, newPrice: number) => {
    setItems(prevItems => 
      prevItems.map(item => item.id === id ? { ...item, selectedPrice: newPrice, total: item.quantity * newPrice } : item)
    );
  };

  const updateItemSku = (id: string, newSku: string) => {
    setItems(prevItems => 
      prevItems.map(item => item.id === id ? { ...item, SKU: newSku } : item)
    );
  };

  const handleReset = () => {
    if (confirm('Clear all items?')) {
      setItems([]);
    }
  };

  const handlePrint = async () => {
    if (items.length === 0) {
      alert('Please add products first!');
      return;
    }
    await generatePDF(customer, items, invoiceInfo, seller, bank, remarks, fees);
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      alert('Please add products first!');
      return;
    }
    exportToExcel(customer, items, invoiceInfo, seller, fees);
  };

  const addCustomRow = (setter: Dispatch<SetStateAction<CustomRow[]>>) => {
    setter(prev => [...prev, { id: genId(), label: '', value: '' }]);
  };

  const removeCustomRow = (setter: Dispatch<SetStateAction<CustomRow[]>>, id: string) => {
    setter(prev => prev.filter(r => r.id !== id));
  };

  const updateCustomRowLabel = (setter: Dispatch<SetStateAction<CustomRow[]>>, id: string, label: string) => {
    setter(prev => prev.map(r => r.id === id ? { ...r, label } : r));
  };

  const updateCustomRowValue = (setter: Dispatch<SetStateAction<CustomRow[]>>, id: string, value: string) => {
    setter(prev => prev.map(r => r.id === id ? { ...r, value } : r));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = subtotal + fees.shippingCost + fees.handlingFee + fees.tax;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-200 text-slate-800 antialiased font-sans overflow-hidden">
      {/* Sidebar - 产品选择与操作 */}
      <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shadow-sm z-30 shrink-0 h-[45vh] md:h-full">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Add Products</h2>
          </div>
          <button onClick={handleReset} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors" title="Clear Catalog">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <ProductSearch onAddProduct={addProduct} />
        </div>
        <div className="p-2 md:p-4 bg-slate-50 border-t border-slate-200 flex md:flex-col gap-2">
          <button 
            onClick={handlePrint}
            disabled={items.length === 0}
            className="flex-1 md:w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-2 md:py-3 rounded-md md:rounded-lg text-[10px] md:text-xs flex items-center justify-center gap-1.5 md:gap-2 shadow-sm md:shadow-md uppercase tracking-tight md:tracking-widest transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="truncate">Export PDF</span>
          </button>
          <button 
            onClick={handleExportExcel}
            disabled={items.length === 0}
            className="flex-1 md:w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-2 md:py-3 rounded-md md:rounded-lg text-[10px] md:text-xs flex items-center justify-center gap-1.5 md:gap-2 shadow-sm md:shadow-md uppercase tracking-tight md:tracking-widest transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="truncate">Export Excel</span>
          </button>
        </div>
      </aside>

      {/* 预览即可编辑区域 */}
      <main 
        ref={mainRef}
        className="flex-1 overflow-auto p-2 md:p-10 flex flex-col items-center bg-slate-100 scroll-smooth relative touch-pan-x touch-pan-y"
      >
        
        {/* 缩放控制工具栏 - 移动端大幅缩小 */}
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 flex flex-col items-center gap-1.5 md:gap-3 z-40 bg-white/90 backdrop-blur-md p-1.5 md:p-4 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xl transition-all">
          <button 
            onClick={() => setScale(s => Math.min(3, s + 0.1))} 
            className="p-1.5 md:p-2.5 hover:bg-blue-50 text-blue-600 transition-all rounded-full active:scale-90"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </button>
          
          <div className="relative group flex flex-col items-center">
            <span className="text-[8px] md:text-[10px] font-bold text-slate-400 mb-0.5 md:mb-1">{Math.round(scale * 100)}%</span>
            <div className="h-16 md:h-32 flex items-center py-1 md:py-2">
              <input 
                type="range"
                min="0.1"
                max="2"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="appearance-none h-1 md:h-1.5 bg-slate-100 rounded-full outline-none accent-blue-600 rotate-[-90deg] w-16 md:w-32 cursor-pointer hover:bg-slate-200 transition-colors"
                style={{ 
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(scale - 0.1) / (2 - 0.1) * 100}%, #f1f5f9 ${(scale - 0.1) / (2 - 0.1) * 100}%, #f1f5f9 100%)` 
                }}
              />
            </div>
          </div>

          <button 
            onClick={() => setScale(s => Math.max(0.1, s - 0.1))} 
            className="p-1.5 md:p-2.5 hover:bg-blue-50 text-blue-600 transition-all rounded-full active:scale-90"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </button>
          
          <div className="h-px w-4 md:w-8 bg-slate-100 my-0.5 md:my-1"></div>

          <button 
            onClick={resetView} 
            className="p-1.5 md:p-2.5 bg-blue-600 hover:bg-blue-700 text-white transition-all rounded-full shadow-lg shadow-blue-200 active:scale-75"
            title="Reset"
          >
            <Maximize className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </button>
        </div>

        {/* 预览容器：通过 scale 变换实现放大缩小 */}
        <div 
          className="transition-transform duration-200 origin-top"
          style={{ transform: `scale(${scale})` }}
        >
          <motion.div 
            key={resetKey}
            ref={previewRef}
            drag={scale > 0.5} // 降低开启拖拽的阈值
            dragMomentum={false}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              scale: 1 // 视觉上的缩放由外层 div 控制，motion 只处理拖拽
            }}
            className="w-[900px] bg-white shadow-2xl min-h-fit p-4 flex flex-col relative my-4 border border-black shrink-0 font-sans leading-normal cursor-grab active:cursor-grabbing"
          >
            {/* Header Section */}
            <div className="border border-black p-0">
              <div className="flex border-b border-black">
                <div className="w-32 border-r border-black flex items-center justify-center p-2 relative group cursor-pointer">
                  {seller.logo ? (
                    <img src={seller.logo} alt="Logo" className="max-w-full max-h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-900 rounded flex items-center justify-center text-white font-black italic">L</div>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => setSeller({...seller, logo: re.target?.result as string});
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                <div className="flex-1 text-center py-2">
                  <InlineInput 
                    value={seller.companyName} 
                    onChange={(v: string) => setSeller({...seller, companyName: v})}
                    className="text-2xl font-bold text-center"
                  />
                </div>
              </div>
              <div className="text-[10px] space-y-0.5 border-b border-black font-bold">
                <div className="flex justify-center gap-1">
                  <span>Office Add:</span>
                  <InlineInput value={seller.officeAdd} onChange={(v: string) => setSeller({...seller, officeAdd: v})} className="font-normal w-auto inline-block min-w-[200px]" />
                </div>
                <div className="flex justify-center gap-1 border-t border-black">
                  <span>Factory Add:</span>
                  <InlineInput value={seller.factoryAdd} onChange={(v: string) => setSeller({...seller, factoryAdd: v})} className="font-normal w-auto inline-block min-w-[200px]" />
                </div>
                <div className="flex justify-center gap-1 border-t border-black">
                  <span>New Factory Add:</span>
                  <InlineInput value={seller.newFactoryAdd} onChange={(v: string) => setSeller({...seller, newFactoryAdd: v})} className="font-normal w-auto inline-block min-w-[200px]" />
                </div>
              </div>
              <div className="text-[10px] flex justify-center gap-4 py-0.5 border-b border-black font-bold">
                <div className="flex gap-1"><span>Tel:</span><InlineInput value={seller.tel} onChange={(v: string) => setSeller({...seller, tel: v})} className="font-normal w-24" /></div>
                <div className="flex gap-1"><span>Fax:</span><InlineInput value={seller.fax} onChange={(v: string) => setSeller({...seller, fax: v})} className="font-normal w-24" /></div>
                <div className="flex gap-1"><span>Email:</span><InlineInput value={seller.email} onChange={(v: string) => setSeller({...seller, email: v})} className="font-normal w-40" /></div>
              </div>
              <div className="text-[10px] flex justify-center gap-1 py-0.5 font-bold">
                <span>Web:</span><InlineInput value={seller.web} onChange={(v: string) => setSeller({...seller, web: v})} className="font-normal w-40" />
              </div>
            </div>

            {/* Title Bar */}
            <div className="bg-[#B8CCE4] text-center border-x border-b border-black py-1">
              <h1 className="text-xl font-bold uppercase tracking-tight">PROFORMA INVOICE</h1>
            </div>

            {/* Buyer's Information */}
            <div className="border-x border-b border-black">
              <div className="bg-white px-2 py-0.5 font-bold text-[13px] border-b border-black text-left">Buyer's information</div>
              <div className="divide-y divide-black text-[12px]">
                <div className="flex group/row">
                  <div className="w-48 bg-white border-r border-black px-2 py-1 text-right font-bold">Company Name:</div>
                  <div className="flex-1 px-2 py-1 relative"><InlineInput value={customer.companyName} onChange={(v: string) => setCustomer({...customer, companyName: v})} className="font-bold border-none" /></div>
                </div>
                <div className="flex min-h-[60px] group/row">
                  <div className="w-48 border-r border-black px-2 py-1 text-right font-bold flex items-center justify-end">Address:</div>
                  <div className="flex-1 px-2 py-1 relative"><InlineInput value={customer.address} onChange={(v: string) => setCustomer({...customer, address: v})} rows={3} className="border-none" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-48 border-r border-black px-2 py-1 text-right font-bold">Telephone/Fax:</div>
                  <div className="flex-1 px-2 py-1 relative"><InlineInput value={customer.telFax} onChange={(v: string) => setCustomer({...customer, telFax: v})} className="border-none" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-48 border-r border-black px-2 py-1 text-right font-bold">Contact:</div>
                  <div className="flex-1 px-2 py-1 relative"><InlineInput value={customer.contact} onChange={(v: string) => setCustomer({...customer, contact: v})} className="border-none" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-48 border-r border-black px-2 py-1 text-right font-bold">Email Address:</div>
                  <div className="flex-1 px-2 py-1 relative"><InlineInput value={customer.email} onChange={(v: string) => setCustomer({...customer, email: v})} className="border-none" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-48 border-r border-black px-2 py-1 text-right font-bold">Invoice No.:</div>
                  <div className="flex-1 px-2 py-1 relative"><InlineInput value={invoiceInfo.invoiceNo} onChange={(v: string) => setInvoiceInfo({...invoiceInfo, invoiceNo: v})} className="border-none" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-48 border-r border-black px-2 py-1 text-right font-bold">Date:</div>
                  <div className="flex-1 px-2 py-1 flex items-center relative">
                    <input type="date" value={invoiceInfo.date} onChange={(e) => setInvoiceInfo({...invoiceInfo, date: e.target.value})} className="bg-transparent outline-none w-full font-sans" />
                  </div>
                </div>
                <div className="flex group/row">
                  <div className="w-48 border-r border-black px-2 py-1 text-right font-bold uppercase">payment:</div>
                  <div className="flex-1 px-2 py-1 relative"><InlineInput value={invoiceInfo.payment} onChange={(v: string) => setInvoiceInfo({...invoiceInfo, payment: v})} className="font-bold border-none" /></div>
                </div>
                {buyerCustomRows.map(row => (
                  <div key={row.id} className="flex group/row">
                    <div className="w-48 border-r border-black px-2 py-1 text-right">
                      <InlineInput value={row.label} onChange={(v: string) => updateCustomRowLabel(setBuyerCustomRows, row.id, v)} className="text-right font-bold border-none" placeholder="Label" />
                    </div>
                    <div className="flex-1 px-2 py-1 relative">
                      <InlineInput value={row.value} onChange={(v: string) => updateCustomRowValue(setBuyerCustomRows, row.id, v)} className="border-none" placeholder="Value" />
                      <button onClick={() => removeCustomRow(setBuyerCustomRows, row.id)} className="absolute -right-5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addCustomRow(setBuyerCustomRows)} className="w-full py-1 text-[10px] text-slate-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors cursor-pointer">
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>

            {/* Product Table */}
            <div className="border-x border-b border-black flex-1 mt-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#4F81BD] text-[10px] text-white font-bold h-8">
                    <th className="border-r border-black w-6 text-center">N</th>
                    <th className="border-r border-black text-center px-1">Model No</th>
                    <th className="border-r border-black text-center px-1">Picture</th>
                    <th className="border-r border-black text-center px-1">Description</th>
                    <th className="border-r border-black w-10 text-center px-1">QTY</th>
                    <th className="border-r border-black w-12 text-center px-1">Units</th>
                    <th className="border-r border-black w-24 text-center px-1">
                      Unit Price (
                      <InlineInput 
                        value={invoiceInfo.currency} 
                        onChange={(v: string) => setInvoiceInfo({...invoiceInfo, currency: v})} 
                        className="w-10 inline-block text-center font-bold text-white placeholder:text-white/50"
                      />
                      )
                    </th>
                    <th className="text-center px-1">Amount({invoiceInfo.currency})</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {items.length === 0 ? (
                    <tr><td colSpan={8} className="py-20 text-center italic text-slate-400">Add products to see them here</td></tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="border-t border-black group">
                        <td className="border-r border-black text-center py-2 font-bold">{idx + 1}</td>
                        <td className="border-r border-black text-center px-1">
                          <InlineInput 
                            value={item.SKU} 
                            onChange={(v: string) => updateItemSku(item.id, v)}
                            className="text-center font-bold"
                          />
                        </td>
                        <td className="border-r border-black p-1 flex justify-center items-center h-28">
                          {item.Image ? (
                            <img src={item.Image} alt="" className="w-24 h-24 object-contain" />
                          ) : (
                            <ImageIconLucide className="w-6 h-6 text-slate-300" />
                          )}
                        </td>
                        <td className="border-r border-black px-2 py-1 text-left">
                          <InlineInput 
                            value={item.Name} 
                            onChange={(v: string) => updateItemName(item.id, v)}
                            rows={3}
                            className="text-[11px] leading-tight"
                          />
                        </td>
                        <td className="border-r border-black text-center px-1">
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-10 text-center bg-transparent font-bold outline-none"
                          />
                        </td>
                        <td className="border-r border-black text-center px-1 font-bold">
                          <InlineInput 
                            value={item.Unit || '/'} 
                            onChange={(v: string) => {
                              setItems(prev => prev.map(i => i.id === item.id ? {...i, Unit: v} : i));
                            }}
                            className="text-center font-bold"
                          />
                        </td>
                        <td className="border-r border-black text-right px-2 font-bold whitespace-nowrap">
                          {invoiceInfo.currency === 'USD' ? '$' : ''}
                          <input 
                            type="number" 
                            value={item.selectedPrice} 
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="w-16 text-right bg-transparent font-bold outline-none"
                          />
                        </td>
                        <td className="text-right px-2 font-black relative">
                          {invoiceInfo.currency === 'USD' ? '$' : ''}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          <button onClick={() => removeItem(item.id)} className="absolute -right-6 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Fixed Summary Rows */}
                  <tr className="border-t border-black font-bold h-10">
                    <td className="border-r border-black text-center"></td>
                    <td colSpan={2} className="border-r border-black px-2 text-left uppercase">Shipping Cost</td>
                    <td colSpan={4} className="border-r border-black"></td>
                    <td className="text-right px-2">
                      <div className="flex items-center justify-end">
                        {invoiceInfo.currency === 'USD' ? '$' : ''}
                        <input type="number" value={fees.shippingCost} onChange={(e) => setFees({...fees, shippingCost: parseFloat(e.target.value) || 0})} className="w-20 text-right bg-transparent outline-none font-bold" />
                      </div>
                    </td>
                  </tr>
                  <tr className="border-t border-black font-bold h-10">
                    <td className="border-r border-black text-center"></td>
                    <td colSpan={2} className="border-r border-black px-2 text-left uppercase">Handing Fee</td>
                    <td colSpan={4} className="border-r border-black"></td>
                    <td className="text-right px-2">
                      <div className="flex items-center justify-end">
                        {invoiceInfo.currency === 'USD' ? '$' : ''}
                        <input type="number" value={fees.handlingFee} onChange={(e) => setFees({...fees, handlingFee: parseFloat(e.target.value) || 0})} className="w-20 text-right bg-transparent outline-none font-bold" />
                      </div>
                    </td>
                  </tr>
                  <tr className="border-t border-black font-bold h-10 bg-slate-50">
                    <td className="border-r border-black text-center"></td>
                    <td colSpan={2} className="border-r border-black px-2 text-left">TOTAL</td>
                    <td colSpan={4} className="border-r border-black text-right pr-4 italic">TOTAL ({invoiceInfo.currency})</td>
                    <td className="text-right px-2 text-red-600 font-black text-sm">
                      {invoiceInfo.currency === 'USD' ? '$' : ''}
                      {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {invoiceInfo.currency !== 'USD' ? ` ${invoiceInfo.currency}` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks Section */}
            <div className="border-x border-b border-black p-1 text-left">
              <p className="text-red-600 font-bold text-[10px] uppercase">REMARK:</p>
              <div className="text-[10px] font-bold space-y-0.5 mt-0.5">
                <div className="flex gap-1 border-b border-black pb-0.5 px-6 group/row">
                  <span className="w-24">SHIPPING DAY:</span>
                  <InlineInput value={remarks.shippingDay} onChange={(v: string) => setRemarks({...remarks, shippingDay: v})} className="flex-1" />
                </div>
                <div className="flex gap-1 border-b border-black pb-0.5 px-6 group/row">
                  <span className="w-24">WARRANTY:</span>
                  <InlineInput value={remarks.warranty} onChange={(v: string) => setRemarks({...remarks, warranty: v})} className="flex-1" />
                </div>
                <div className="flex gap-1 border-b border-black pb-0.5 px-6 group/row">
                  <span className="w-24">PACKING:</span>
                  <InlineInput value={remarks.packing} onChange={(v: string) => setRemarks({...remarks, packing: v})} className="flex-1" />
                </div>
                <div className="flex gap-1 px-6 group/row">
                  <span className="w-24">SHIPMENT:</span>
                  <div className="flex gap-1 items-center">
                    <span>FROM GUANGZHOU TO</span>
                    <InlineInput value={remarks.shipmentTo} onChange={(v: string) => setRemarks({...remarks, shipmentTo: v})} className="inline-block w-20" />
                  </div>
                </div>
                {remarkCustomRows.map(row => (
                  <div key={row.id} className="flex gap-1 border-b border-black pb-0.5 px-6 group/row">
                    <InlineInput value={row.label} onChange={(v: string) => updateCustomRowLabel(setRemarkCustomRows, row.id, v)} className="w-24 font-bold text-right" placeholder="Label" />
                    <div className="flex-1 relative">
                      <InlineInput value={row.value} onChange={(v: string) => updateCustomRowValue(setRemarkCustomRows, row.id, v)} className="w-full" placeholder="Value" />
                      <button onClick={() => removeCustomRow(setRemarkCustomRows, row.id)} className="absolute -right-5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addCustomRow(setRemarkCustomRows)} className="w-full py-1 text-[10px] text-slate-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors cursor-pointer border-t border-black mt-0.5">
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>

            {/* PayPal Info Section */}
            <div className="border-x border-b border-black">
              <div className="bg-white px-2 py-0.5 font-bold text-[11px] border-b border-black text-blue-600 uppercase text-left">PAYPAL INFORMATION</div>
              <div className="divide-y divide-black text-[12px]">
                <div className="flex group/row">
                  <div className="w-48 border-r border-black px-2 py-1 text-right font-bold uppercase">ACCOUNT NAME:</div>
                  <div className="flex-1 px-2 py-1 text-center font-bold text-lg leading-none relative">
                    <InlineInput value={bank.paypalAccount} onChange={(v: string) => setBank({...bank, paypalAccount: v})} className="text-center font-bold" />
                  </div>
                </div>
                {paypalCustomRows.map(row => (
                  <div key={row.id} className="flex group/row">
                    <div className="w-48 border-r border-black px-2 py-1 text-right">
                      <InlineInput value={row.label} onChange={(v: string) => updateCustomRowLabel(setPaypalCustomRows, row.id, v)} className="text-right font-bold uppercase border-none" placeholder="Label" />
                    </div>
                    <div className="flex-1 px-2 py-1 relative">
                      <InlineInput value={row.value} onChange={(v: string) => updateCustomRowValue(setPaypalCustomRows, row.id, v)} className="border-none" placeholder="Value" />
                      <button onClick={() => removeCustomRow(setPaypalCustomRows, row.id)} className="absolute -right-5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addCustomRow(setPaypalCustomRows)} className="w-full py-1 text-[10px] text-slate-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors cursor-pointer">
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>

            {/* Bank Info Section */}
            <div className="border-x border-b border-black">
              <div className="bg-white px-2 py-0.5 font-bold text-[11px] border-b border-black text-blue-600 uppercase text-left">BANK INFORMATION</div>
              <div className="divide-y divide-black text-[12px]">
                <div className="flex group/row">
                  <div className="w-80 border-r border-black px-2 py-1 text-right font-bold uppercase">ACCOUNT NAME:</div>
                  <div className="flex-1 px-2 py-1 font-bold relative"><InlineInput value={bank.accountName} onChange={(v: string) => setBank({...bank, accountName: v})} className="font-bold" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-80 border-r border-black px-2 py-1 text-right font-bold uppercase">ACCOUNT ADDRESS:</div>
                  <div className="flex-1 px-2 py-1 font-bold relative"><InlineInput value={bank.accountAddress} onChange={(v: string) => setBank({...bank, accountAddress: v})} className="font-bold" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-80 border-r border-black px-2 py-1 text-right font-bold uppercase">BENEFICIARY BANK:</div>
                  <div className="flex-1 px-2 py-1 font-bold relative"><InlineInput value={bank.beneficiaryBank} onChange={(v: string) => setBank({...bank, beneficiaryBank: v})} className="font-bold" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-80 border-r border-black px-2 py-1 text-right font-bold uppercase">BANK ADDRESS:</div>
                  <div className="flex-1 px-2 py-1 font-bold relative"><InlineInput value={bank.bankAddress} onChange={(v: string) => setBank({...bank, bankAddress: v})} className="font-bold" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-80 border-r border-black px-2 py-1 text-right font-bold uppercase">ACCOUNT NUMBER:</div>
                  <div className="flex-1 px-2 py-1 font-bold relative"><InlineInput value={bank.accountNumber} onChange={(v: string) => setBank({...bank, accountNumber: v})} className="font-bold" /></div>
                </div>
                <div className="flex group/row">
                  <div className="w-80 border-r border-black px-2 py-1 text-right font-bold uppercase">SWIFT CODE:</div>
                  <div className="flex-1 px-2 py-1 font-bold relative"><InlineInput value={bank.swiftCode} onChange={(v: string) => setBank({...bank, swiftCode: v})} className="font-bold" /></div>
                </div>
                {bankCustomRows.map(row => (
                  <div key={row.id} className="flex group/row">
                    <div className="w-80 border-r border-black px-2 py-1 text-right">
                      <InlineInput value={row.label} onChange={(v: string) => updateCustomRowLabel(setBankCustomRows, row.id, v)} className="text-right font-bold uppercase border-none" placeholder="Label" />
                    </div>
                    <div className="flex-1 px-2 py-1 font-bold relative">
                      <InlineInput value={row.value} onChange={(v: string) => updateCustomRowValue(setBankCustomRows, row.id, v)} className="font-bold border-none" placeholder="Value" />
                      <button onClick={() => removeCustomRow(setBankCustomRows, row.id)} className="absolute -right-5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addCustomRow(setBankCustomRows)} className="w-full py-1 text-[10px] text-slate-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors cursor-pointer">
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>
            {/* 底部提示 */}
            <div className="mt-2 text-left">
              <p className="text-[10px] font-bold italic text-slate-500">
                * Please check the items and quantity carefully after receiving the proforma invoice. 
                Any discrepancies should be reported within 3 working days.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}