"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const labelFieldMap: { [key: string]: string } = {
  "Order No": "Order Number",
  "Delivery Date": "DELIVERY DATE",
  "Product Code": "productcode",
  "Product Description": "productDescription",
  "Quantity": "Quantity",
  "Customer Name": "Account Name",
  "Address": "Address1", // You can combine Address1, Address2, Address3 if needed
  "Parts": "Max. Parts",
  // Add more mappings as needed
};

const getLabelValue = (row: any, labelField: string) => {
  const excelField = labelFieldMap[labelField] || labelField;
  return row[excelField] ?? '';
};

function SidebarLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  const icons: Record<string, JSX.Element> = {
    home: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m-4 0h4" /></svg>
    ),
    cube: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7.5V17a2 2 0 01-2 2H6a2 2 0 01-2-2V7.5M12 3l8 4.5M12 3L4 7.5m8-4.5v13.5" /></svg>
    ),
    "shopping-cart": (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>
    ),
    upload: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 12V8a2 2 0 012-2h12a2 2 0 012 2v4M12 16V4m0 0l-4 4m4-4l4 4" /></svg>
    ),
    tag: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H8a1 1 0 01-1-1V7z" /></svg>
    ),
    "file-text": (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16h8M8 12h8m-8-4h8M4 6h16M4 6v12a2 2 0 002 2h8a2 2 0 002-2V6" /></svg>
    ),
    printer: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 9V2h12v7M6 18v4h12v-4M6 14h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2z" /></svg>
    ),
  };
  return (
    <Link href={href} className="flex items-center px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 font-medium">
      {icons[icon as keyof typeof icons]}
      {label}
    </Link>
  );
}

export default function CustomerLabelsPage() {
  const [labels, setLabels] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 1 }) as any[][];
      if (jsonData.length < 2) {
        setLabels([]);
        setHeaders([]);
        alert('No data found in file.');
        return;
      }
      const headers = jsonData[0].map((h: any) => h ? h.toString().trim() : '');
      setHeaders(headers);
      const rows = jsonData.slice(1).map((row) => {
        const arr = row as any[];
        const obj: any = {};
        headers.forEach((h: string, i: number) => { obj[h] = arr[i] ?? ''; });
        return obj;
      });
      setLabels(rows);
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePrintAll = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    labels.forEach((row, idx) => {
      if (idx !== 0) doc.addPage();
      doc.setFontSize(12);
      doc.text(`Order No: ${getLabelValue(row, 'Order No')}`, 40, 40);
      doc.text(`Delivery Date: ${getLabelValue(row, 'Delivery Date')}`, 40, 60);
      doc.text(`Vehicle: ${row['Vehicle'] || ''}`, 40, 80);
      doc.text('Shipping Details:', 40, 110);
      doc.text(`${getLabelValue(row, 'Address')}`, 60, 130, { maxWidth: 300 });
      doc.text(`Assemble: ${row['Assemble'] || 'No'}`, 40, 160);
      doc.text('Parts:', 40, 190);
      doc.setFontSize(28);
      doc.text(`${idx + 1} / ${getLabelValue(row, 'Parts') || labels.length}`, 90, 220);
      doc.setFontSize(12);
      doc.text('Order Details:', 40, 260);
      doc.text('Qty', 40, 280);
      doc.text('Product Code', 90, 280);
      doc.text('Product Description', 200, 280);
      doc.text(`${getLabelValue(row, 'Quantity')}`, 40, 300);
      doc.text(`${getLabelValue(row, 'Product Code')}`, 90, 300);
      doc.text(`${getLabelValue(row, 'Product Description')}`, 200, 300, { maxWidth: 300 });
      doc.setFontSize(32);
      doc.text(`${getLabelValue(row, 'Customer Name')}`, 400, 100, { maxWidth: 180 });
      doc.setFontSize(24);
      doc.text(`${row['BRS'] || ''}`, 500, 60);
    });
    doc.save('labels.pdf');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col justify-between py-6 px-4">
        <div>
          <div className="flex flex-col items-start mb-8">
            <span className="font-bold text-lg text-blue-700 flex items-center gap-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v4a1 1 0 001 1h3m10-5h3a1 1 0 011 1v4a1 1 0 01-1 1h-3m-10 0v6a2 2 0 002 2h8a2 2 0 002-2v-6m-10 0h10" /></svg>
              OmniWTMS
            </span>
            <span className="text-xs text-gray-400 mt-1">Customer Portal</span>
            <Button 
              onClick={() => { localStorage.removeItem('currentCustomer'); window.location.href = '/auth/login'; }} 
              className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2 justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
              Logout
            </Button>
          </div>
          <nav className="flex flex-col gap-2 mb-8">
            <SidebarLink icon="home" label="Dashboard" href="/customer" />
            <SidebarLink icon="cube" label="Inventory" href="/customer/inventory" />
            <SidebarLink icon="shopping-cart" label="Orders" href="/customer/orders" />
            <SidebarLink icon="tag" label="Labels" href="/customer/labels" />
          </nav>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center mb-4">
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
              <label htmlFor="excel-upload" className="flex flex-col items-center cursor-pointer">
                <div className="bg-gray-100 rounded-full p-4 mb-2">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-blue-600 underline">Click to upload Excel file</span>
                <span className="text-xs text-gray-400 mt-1">.xlsx or .xls files only</span>
              </label>
              <div className="text-xs text-gray-500 mt-2">Required columns: Order No, Delivery Date, Vehicle, Customer Name, Address, Phone, Product Code, Product Description, Quantity</div>
              {fileName && <div className="mt-2 text-sm">Selected file: {fileName}</div>}
            </div>
            <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handlePrintAll} disabled={labels.length === 0}>
              Print All Labels
            </Button>
          </div>
          {/* Label Previews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {labels.map((row, idx) => (
              <div key={idx} className="border rounded p-4 bg-white shadow text-xs">
                <div><b>Order No:</b> {getLabelValue(row, 'Order No')}</div>
                <div><b>Delivery Date:</b> {getLabelValue(row, 'Delivery Date')}</div>
                <div><b>Vehicle:</b> {row['Vehicle'] || ''}</div>
                <div><b>Shipping Details:</b></div>
                <div style={{ marginLeft: 16 }}>{getLabelValue(row, 'Address')}</div>
                <div><b>Assemble:</b> {row['Assemble'] || 'No'}</div>
                <div><b>Parts:</b> {idx + 1} / {getLabelValue(row, 'Parts') || labels.length}</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', margin: '12px 0' }}>{getLabelValue(row, 'Customer Name')}</div>
                <div><b>Order Details:</b></div>
                <div style={{ marginLeft: 16 }}>Qty: {getLabelValue(row, 'Quantity')} | Product Code: {getLabelValue(row, 'Product Code')} | Product Description: {getLabelValue(row, 'Product Description')}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 