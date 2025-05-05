"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/auth/SupabaseClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

const headerMap: { [key: string]: string } = {
  'accountn': 'account',
  'action': 'action',
  'address1': 'address1',
  'address2': 'address2',
  'address3': 'address3',
  'assemble': 'assembly',
  'assistedl': 'assisted',
  'delivery': 'delivery',
  'deliveryid': 'deliveryid',
  'emailadd': 'emailadd',
  'hub': 'hub',
  'ordernumbr': 'order_numbr',
  'postcode': 'postcod',
  'productcode': 'productcode',
  'productdescription': 'productref',
  'recipient': 'recipient',
  'telephone': 'telephon',
  'towncity': 'towncity',
  'warehouse': 'warehou',
  'cube': 'cube',
  'weightk': 'weight_k',
  'maxparts': 'max_par',
  'quantity': 'quantity',
  'accountname': 'Account Name',
};

export default function CustomerInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const router = useRouter();
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<any>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadRows, setUploadRows] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    const customerStr = localStorage.getItem('currentCustomer');
    if (!customerStr) {
      router.push('/auth/login');
      return;
    }
    const customer = JSON.parse(customerStr);
    
    // Fetch inventory for this customer
    supabase
      .from('customer_inventory')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setInventory(data || []));
  }, [router]);

  const handleEditRow = (row: any) => {
    setEditingRowId(row.id);
    setEditRowData({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditRowData({});
  };

  const handleSaveEdit = async () => {
    if (!editingRowId) return;
    const { id, ...updateData } = editRowData;
    const { error } = await supabase
      .from('customer_inventory')
      .update(updateData)
      .eq('id', editingRowId);
    if (error) {
      console.error('Error updating inventory:', error);
    } else {
      setEditingRowId(null);
      setEditRowData({});
      // Refresh inventory data
      const customerStr = localStorage.getItem('currentCustomer');
      if (customerStr) {
        const customer = JSON.parse(customerStr);
        const { data } = await supabase
          .from('customer_inventory')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });
        setInventory(data || []);
      }
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const { error } = await supabase
        .from('customer_inventory')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Error deleting inventory:', error);
      } else {
        // Refresh inventory data
        const customerStr = localStorage.getItem('currentCustomer');
        if (customerStr) {
          const customer = JSON.parse(customerStr);
          const { data } = await supabase
            .from('customer_inventory')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false });
          setInventory(data || []);
        }
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, header: 1 });

        if (jsonData.length < 2) {
          alert('Excel file must have at least a header row and one data row');
          return;
        }

        // Normalize headers
        const headers = (jsonData[0] as string[]).map(header =>
          header ? header.toString().replace(/\s|\./g, '').toLowerCase() : ''
        );

        // Map Excel columns to DB columns using headerMap
        const processedRows = jsonData.slice(1).map((row: any) => {
          const processedRow: any = {};
          headers.forEach((header, idx) => {
            const dbCol = headerMap[header];
            if (dbCol) {
              processedRow[dbCol] = row[idx];
            }
          });
          return processedRow;
        });

        setUploadRows(processedRows);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please make sure it\'s a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveInventory = async () => {
    setUploadLoading(true);
    try {
      const customerStr = localStorage.getItem('currentCustomer');
      if (!customerStr) {
        router.push('/auth/login');
        return;
      }
      const customer = JSON.parse(customerStr);

      // Only allow columns that exist in the DB
      const allowedColumns = [
        'account', 'action', 'address1', 'address2', 'address3', 'assembly', 'assisted',
        'delivery', 'deliveryid', 'emailadd', 'hub', 'order_numbr', 'postcod', 'productcode',
        'productref', 'recipient', 'telephon', 'towncity', 'warehou', 'cube', 'weight_k',
        'max_par', 'quantity', 'Account Name', 'customer_id', 'created_at'
      ];

      const rowsToInsert = uploadRows.map(row => {
        const filtered: Record<string, any> = {};
        allowedColumns.forEach(col => {
          if (row[col] !== undefined) filtered[col] = row[col];
        });
        // Always set customer_id and created_at
        filtered.customer_id = customer.id;
        filtered.created_at = new Date().toISOString();
        return filtered;
      });

      const { error } = await supabase
        .from('customer_inventory')
        .insert(rowsToInsert);

      if (error) {
        console.error('Error saving inventory:', error);
        // No popup, just log
      } else {
        toast.success('Successfully saved!');
        setShowUploadModal(false);
        setUploadRows([]);
        // Refresh inventory data
        const { data } = await supabase
          .from('customer_inventory')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });
        setInventory(data || []);
      }
    } catch (error) {
      console.error('Error saving inventory:', error);
      // No popup, just log
    } finally {
      setUploadLoading(false);
    }
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
            <Link href="/customer" className="flex items-center px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 font-medium">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m-4 0h4" /></svg>
              Dashboard
            </Link>
            <Link href="/customer/inventory" className="flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7.5V17a2 2 0 01-2 2H6a2 2 0 01-2-2V7.5M12 3l8 4.5M12 3L4 7.5m8-4.5v13.5" /></svg>
              Inventory
            </Link>
            <Link href="/customer/orders" className="flex items-center px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 font-medium">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>
              Orders
            </Link>
            <Link href="/customer/labels" className="flex items-center px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 font-medium">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H8a1 1 0 01-1-1V7z" /></svg>
              Labels
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold mb-1 text-gray-900">Inventory Management</h1>
            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowUploadModal(true)}>
                  Upload Inventory
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Inventory</DialogTitle>
                </DialogHeader>
                <div className="mb-2 text-sm text-gray-600">Upload a CSV or Excel file containing your inventory items. Make sure it follows our template format.</div>
                <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="outline" onClick={() => { setShowUploadModal(false); setUploadRows([]); }}>Cancel</Button>
                  <Button onClick={handleSaveInventory} disabled={uploadLoading || uploadRows.length === 0}>
                    {uploadLoading ? 'Saving...' : 'Save Inventory Data'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto w-full">
              <table className="min-w-[1200px] text-xs">
                <thead>
                  <tr>
                    {inventory[0] && Object.keys(inventory[0])
                      .filter(k => k !== 'id' && k !== 'customer_id' && k !== 'created_at')
                      .map((col, idx) => (
                        <th key={col} className={`px-2 py-1 border-b bg-gray-50 text-left${idx === 0 ? ' sticky left-0 bg-white z-10' : ''}`}>{col}</th>
                      ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={99} className="text-center py-8 text-gray-400">
                        No inventory uploaded yet.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((row: any) => (
                      <tr key={row.id}>
                        {Object.keys(row)
                          .filter(k => k !== 'id' && k !== 'customer_id' && k !== 'created_at')
                          .map((col, idx) => (
                            <td key={col} className={`px-2 py-1 border-b${idx === 0 ? ' sticky left-0 bg-white z-10' : ''}`}>
                              {editingRowId === row.id ? (
                                <input
                                  type="text"
                                  value={editRowData[col] || ''}
                                  onChange={(e) => setEditRowData({ ...editRowData, [col]: e.target.value })}
                                  className="border rounded px-1 py-0.5 w-full"
                                />
                              ) : (
                                row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'
                              )}
                            </td>
                          ))}
                        <td className="px-2 py-1 border-b">
                          {editingRowId === row.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleCancelEdit}
                                className="bg-gray-500 hover:bg-gray-600 text-white"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditRow(row)}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDeleteRow(row.id)}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 