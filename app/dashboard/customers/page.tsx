"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth/SupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

export default function CustomersPage() {
  const [form, setForm] = useState({ name: '', contact: '', password: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);

  // Get current client id from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentClientId(user.id);
      fetchCustomers(user.id);
    }
  }, []);

  // Fetch customers for this client
  const fetchCustomers = async (clientId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (!error) setCustomers(data || []);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!form.name || !form.contact || !form.password) {
      toast.error('All fields are required');
      setLoading(false);
      return;
    }
    if (!currentClientId) {
      toast.error('No client ID found');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('customers')
      .insert([{ 
        name: form.name, 
        contact_number: form.contact, 
        password: form.password,
        email: form.email,
        client_id: currentClientId
      }]);

    setLoading(false);

    if (error) {
      toast.error('Failed to add customer');
    } else {
      toast.success('Customer added!');
      setForm({ name: '', contact: '', password: '', email: '' });
      fetchCustomers(currentClientId);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Add Customer</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Input
          name="name"
          placeholder="Customer Name"
          value={form.name}
          onChange={handleChange}
        />
        <Input
          name="contact"
          placeholder="Contact Number"
          value={form.contact}
          onChange={handleChange}
        />
        <Input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add Customer'}
        </Button>
      </form>

      <h2 className="text-xl font-semibold mt-8 mb-2">Customer List</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Contact Number</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Password</th>
              <th className="border px-4 py-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4">No customers found.</td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td className="border px-4 py-2">{c.name}</td>
                  <td className="border px-4 py-2">{c.contact_number}</td>
                  <td className="border px-4 py-2">{c.email || ''}</td>
                  <td className="border px-4 py-2">{c.password || ''}</td>
                  <td className="border px-4 py-2">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 