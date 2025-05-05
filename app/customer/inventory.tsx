"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth/SupabaseClient';

export default function CustomerInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  useEffect(() => {
    const customerStr = localStorage.getItem('currentCustomer');
    if (!customerStr) return;
    const customer = JSON.parse(customerStr);
    supabase
      .from('customer_inventory')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setInventory(data || []));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-lg font-semibold mb-4">All Uploaded Inventory</h2>
      <div className="overflow-x-auto w-full">
        <table className="min-w-[1200px] text-xs">
          <thead>
            <tr>
              {inventory[0] && Object.keys(inventory[0])
                .filter(k => k !== 'id' && k !== 'customer_id' && k !== 'created_at')
                .map((col, idx) => (
                  <th key={col} className={`px-2 py-1 border-b bg-gray-50 text-left${idx === 0 ? ' sticky left-0 bg-white z-10' : ''}`}>{col}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr><td colSpan={99} className="text-center py-8 text-gray-400">No inventory uploaded yet.</td></tr>
            ) : (
              inventory.map((row: any) => (
                <tr key={row.id}>
                  {Object.keys(row)
                    .filter(k => k !== 'id' && k !== 'customer_id' && k !== 'created_at')
                    .map((col, idx) => (
                      <td key={col} className={`px-2 py-1 border-b${idx === 0 ? ' sticky left-0 bg-white z-10' : ''}`}>
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                      </td>
                    ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 