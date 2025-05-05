"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth/SupabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState([{ description: '', quantity: 1 }]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');

  useEffect(() => {
    const customerStr = localStorage.getItem('currentCustomer');
    if (!customerStr) return;
    const customerObj = JSON.parse(customerStr);
    setCustomer(customerObj);
    supabase
      .from('simple_orders')
      .select('*')
      .eq('customer_id', customerObj.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []));
  }, []);

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
      // Refresh orders
      supabase
        .from('simple_orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setOrders(data || []));
    } catch (err) {
      console.error('Error creating order:', err);
      setOrderSuccessMsg('Failed to create order');
      setTimeout(() => setOrderSuccessMsg(''), 60000);
    } finally {
      setOrderLoading(false);
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
            <SidebarLink icon="home" label="Dashboard" href="/customer" />
            <SidebarLink icon="cube" label="Inventory" href="/customer/inventory" />
            <SidebarLink icon="shopping-cart" label="Orders" href="/customer/orders" />
            <SidebarLink icon="tag" label="Labels" href="/customer/labels" />
          </nav>
          {/* Profile Section */}
          {customer && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="font-semibold text-blue-700 mb-2">Profile</div>
              <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Name:</span> {customer.name}</div>
              <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Email:</span> {customer.email}</div>
              <div className="text-sm text-gray-700"><span className="font-medium">Password:</span> {customer.password}</div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg">
              {customer?.name?.slice(0,2).toUpperCase() || 'JO'}
            </span>
            <span className="text-gray-700 font-medium">{customer?.name}</span>
          </div>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Orders</h1>
            <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowOrderModal(true)}>
                  Create Order
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Your Order</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-gray-500 mb-4">Add items to your order and specify quantities</div>
                {orderItems.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4 mb-4 relative">
                    <div className="font-semibold mb-2">Item {idx + 1}</div>
                    <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-red-500" onClick={() => handleRemoveOrderItem(idx)}>&times;</button>
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1">
                        <label className="block text-xs mb-1">Description</label>
                        <Input value={item.description} onChange={e => handleOrderItemChange(idx, 'description', e.target.value)} placeholder="Enter description" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs mb-1">Quantity</label>
                        <Input type="number" min={1} value={item.quantity} onChange={e => handleOrderItemChange(idx, 'quantity', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full mb-4" onClick={handleAddOrderItem}>+ Add Another Item</Button>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowOrderModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateOrder} disabled={orderLoading || orderItems.length === 0}>
                    {orderLoading ? 'Creating...' : 'Create Order'}
                  </Button>
                </div>
                {orderSuccessMsg && (
                  <div className="text-green-600 text-sm mt-2 text-center">{orderSuccessMsg}</div>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b bg-gray-50 text-left">Description</th>
                    <th className="px-2 py-1 border-b bg-gray-50 text-left">Quantity</th>
                    <th className="px-2 py-1 border-b bg-gray-50 text-left">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-400">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-2 py-1 border-b">{order.description}</td>
                        <td className="px-2 py-1 border-b">{order.quantity}</td>
                        <td className="px-2 py-1 border-b">{order.created_at ? new Date(order.created_at).toLocaleString() : ''}</td>
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