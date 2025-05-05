"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/auth/SupabaseClient';

type SidebarLinkProps = {
  icon: 'home' | 'cube' | 'shopping-cart' | 'upload' | 'tag' | 'file-text' | 'printer';
  label: string;
  href: string;
};

function SidebarLink({ icon, label, href }: SidebarLinkProps) {
  const icons: Record<SidebarLinkProps['icon'], JSX.Element> = {
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
      {icons[icon]}
      {label}
    </Link>
  );
}

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
  'productdescription': 'productref', // or map as needed
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

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<any>(null);
  const router = useRouter();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadRows, setUploadRows] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<any>({});
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState([
    { description: '', quantity: 1 }
  ]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');
  const [orderCount, setOrderCount] = useState(0);
  const [labelPdfCount, setLabelPdfCount] = useState(0);

  useEffect(() => {
    // Get customer from localStorage
    const customerStr = localStorage.getItem('currentCustomer');
    if (!customerStr) {
      router.push('/auth/login');
      return;
    }
    setCustomer(JSON.parse(customerStr));
  }, [router]);

  // Fetch inventory for this customer
  const fetchInventory = async (customerId: string) => {
    const { data, error } = await supabase
      .from('customer_inventory')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (!error) setInventory(data || []);
  };

  useEffect(() => {
    if (customer?.id) fetchInventory(customer.id);
    // Fetch order count
    if (customer?.id) {
      supabase
        .from('simple_orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .then(({ count }) => setOrderCount(count || 0));
    }
    // Fetch label PDF count from localStorage
    const labelCount = Number(localStorage.getItem('labelPdfCount') || '0');
    setLabelPdfCount(labelCount);
  }, [customer]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON with raw headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, header: 1 });
      
      if (jsonData.length < 2) {
        toast.error('Excel file must have at least a header row and one data row');
        return;
      }

      // Normalize headers: remove spaces, periods, lowercase
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
      }).filter(row => row.quantity && !isNaN(row.quantity));

      console.log('Processed rows:', processedRows);
      setUploadRows(processedRows);
      toast.success('File parsed successfully! Review and save.');
    } catch (err) {
      console.error('Error parsing file:', err);
      toast.error('Failed to parse file. Please check the format.');
    }
  };

  // Save uploaded inventory
  const handleSaveInventory = async () => {
    if (!customer?.id || uploadRows.length === 0) return;
    setUploadLoading(true);

    // Define allowed columns that exist in the customer_inventory table
    const allowedColumns = [
      'customer_id',
      'account',
      'action',
      'address1',
      'address2',
      'address3',
      'assembly',
      'assisted',
      'delivery',
      'deliveryid',
      'emailadd',
      'hub',
      'order_numbr',
      'postcod',
      'productcode',
      'productref',
      'recipient',
      'telephon',
      'towncity',
      'warehou',
      'cube',
      'weight_k',
      'max_par',
      'quantity',
      'Account Name'
    ] as const;

    // Create a map of lowercase column names to their original case
    const columnMap = new Map(
      allowedColumns.map(col => [col.toLowerCase(), col])
    );

    // Filter rows to only include allowed columns
    const rowsToInsert = uploadRows.map(row => {
      const filtered: Record<string, any> = { customer_id: customer.id };
      
      // Check each key in the row
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase();
        const dbColumn = columnMap.get(lowerKey);
        if (dbColumn) {  // Only proceed if we found a matching column
          filtered[dbColumn] = row[key];
        }
      });
      
      return filtered;
    });

    console.log('Rows to insert:', rowsToInsert);

    const { error } = await supabase
      .from('customer_inventory')
      .insert(rowsToInsert);
    setUploadLoading(false);
    if (error) {
      console.error('Supabase error:', error);
      toast.error(error.message || 'Failed to save inventory');
    } else {
      toast.success('Inventory saved!');
      setShowUploadModal(false);
      setUploadRows([]);
      fetchInventory(customer.id);
    }
  };

  // Edit/delete inventory items
  const handleDeleteInventory = async (id: string) => {
    const { error } = await supabase
      .from('customer_inventory')
      .delete()
      .eq('id', id);
    if (!error) {
      toast.success('Item deleted');
      fetchInventory(customer.id);
    }
  };

  // Handler to start editing a row
  const handleEditRow = (row: any) => {
    setEditingRowId(row.id);
    setEditRowData({ ...row });
  };

  // Handler to cancel editing
  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditRowData({});
  };

  // Handler to save edited row
  const handleSaveEdit = async () => {
    if (!editingRowId) return;
    const { id, ...updateData } = editRowData;
    const { error } = await supabase
      .from('customer_inventory')
      .update(updateData)
      .eq('id', editingRowId);
    if (error) {
      toast.error(error.message || 'Failed to update inventory');
    } else {
      toast.success('Inventory updated!');
      setEditingRowId(null);
      setEditRowData({});
      if (customer?.id) fetchInventory(customer.id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentCustomer');
    router.push('/auth/login');
  };

  const handleAddOrderItem = () => {
    setOrderItems([...orderItems, { description: '', quantity: 1 }]);
  };
  const handleRemoveOrderItem = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };
  const handleOrderItemChange = (idx: number, field: string, value: any) => {
    setOrderItems(orderItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const handleCreateOrder = async () => {
    if (!customer?.id) return;
    setOrderLoading(true);
    try {
      // Insert each item as a row in simple_orders
      const itemsToInsert = orderItems
        .filter(item => item.description && item.description.trim() !== '' && item.quantity)
        .map(item => ({
          customer_id: customer.id,
          description: item.description,
          quantity: Number(item.quantity) || 1
        }));
      if (itemsToInsert.length === 0) throw new Error('No valid order items');
      const { error } = await supabase
        .from('simple_orders')
        .insert(itemsToInsert);
      if (error) throw error;
      setShowOrderModal(false);
      setOrderItems([{ description: '', quantity: 1 }]);
      setOrderSuccessMsg('Order created successfully!');
      setTimeout(() => setOrderSuccessMsg(''), 60000);
    } catch (err) {
      console.error('Error creating order:', err);
      setOrderSuccessMsg('Failed to create order');
      setTimeout(() => setOrderSuccessMsg(''), 60000);
    } finally {
      setOrderLoading(false);
    }
  };

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

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
              onClick={handleLogout} 
              className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2 justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
              Logout
            </Button>
          </div>
          <nav className="flex flex-col gap-2 mb-8">
            <SidebarLink icon="home" label="Dashboard" href="#" />
            <SidebarLink icon="cube" label="Inventory" href="/customer/inventory" />
            <SidebarLink icon="shopping-cart" label="Orders" href="/customer/orders" />
            <SidebarLink icon="tag" label="Labels" href="/customer/labels" />
          </nav>
          {/* Profile Section */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="font-semibold text-blue-700 mb-2">Profile</div>
            <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Name:</span> {customer.name}</div>
            <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Email:</span> {customer.email}</div>
            <div className="text-sm text-gray-700"><span className="font-medium">Password:</span> {customer.password}</div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg">
              {customer.name?.slice(0,2).toUpperCase() || 'JO'}
            </span>
            <span className="text-gray-700 font-medium">{customer.name}</span>
          </div>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold mb-1 text-gray-900">Dashboard Overview</h1>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border p-4 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">Total Inventory Items</span>
              <span className="font-bold text-lg">{inventory.length}</span>
            </div>
            <div className="bg-white rounded-lg border p-4 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">Last Updated</span>
              <span className="font-bold text-lg">
                {inventory.length > 0 
                  ? new Date(inventory[0].created_at).toLocaleDateString() 
                  : 'Never'}
              </span>
            </div>
            <div className="bg-white rounded-lg border p-4 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">Total Orders</span>
              <span className="font-bold text-lg">{orderCount}</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1 text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mb-6">Welcome to your customer portal. Manage your orders and inventory from one place.</p>
          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 rounded-xl shadow p-6 flex flex-col items-center">
              <svg className="w-8 h-8 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="font-semibold mb-2">Create Order</div>
              <div className="text-xs text-gray-500 mb-4 text-center">Create a new order from your inventory</div>
            </div>
            <div className="bg-green-50 rounded-xl shadow p-6 flex flex-col items-center">
              <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2M9 17v2a4 4 0 004 4h2a4 4 0 004-4v-2" /></svg>
              <div className="font-semibold mb-2">Print Labels</div>
              <div className="text-xs text-gray-500 mb-4 text-center">Print shipping labels for your orders</div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 12V8a2 2 0 012-2h12a2 2 0 012 2v4" /></svg>
              <div className="font-semibold mb-2">Upload Stock</div>
              <div className="text-xs text-gray-500 mb-4 text-center">Upload your inventory list via CSV</div>
            </div>
          </div>
          {/* Orders Tabs */}
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <div className="flex gap-6 border-b mb-4">
              <button className="pb-2 border-b-2 border-blue-600 font-semibold text-blue-600">Recent Orders</button>
              <button className="pb-2 text-gray-500">Shipment Tracking</button>
              <button className="pb-2 text-gray-500">Order Templates</button>
            </div>
            <div className="text-center py-12 text-gray-400 flex flex-col items-center">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18v18H3V3z" /></svg>
              <div className="font-semibold mb-2">No orders found</div>
              <div className="mb-4 text-sm">You haven't placed any orders yet</div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Create Your First Order</Button>
            </div>
          </div>
          {/* Bottom Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border p-6">
              <div className="font-semibold mb-2">CSV Templates</div>
              <div className="flex flex-col gap-2">
                <Link href="#" className="text-blue-600 hover:underline flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 12V8a2 2 0 012-2h12a2 2 0 012 2v4" /></svg>Stock Upload Template</Link>
                <Link href="#" className="text-blue-600 hover:underline flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 12V8a2 2 0 012-2h12a2 2 0 012 2v4" /></svg>Bulk Order Template</Link>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-6">
              <div className="font-semibold mb-2">Quick Access</div>
              <div className="flex flex-col gap-2">
                <Link href="#" className="text-blue-600 hover:underline">Inventory Management</Link>
                <Link href="#" className="text-blue-600 hover:underline">Print Shipping Labels</Link>
                <Link href="#" className="text-blue-600 hover:underline">Thermal Label Printer</Link>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-6">
              <div className="font-semibold mb-2">Help & Support</div>
              <div className="flex flex-col gap-2">
                <Link href="#" className="text-blue-600 hover:underline">Knowledge Base</Link>
                <Link href="#" className="text-blue-600 hover:underline">Contact Support</Link>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-400 py-4">© 2023 OmniWTMS. All rights reserved.</div>
        </div>
      </main>
    </div>
  );
} 