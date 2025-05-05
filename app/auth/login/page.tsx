'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Warehouse, TruckIcon, BoxIcon, BarChart3Icon, Users2Icon } from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = "https://qpkaklmbiwitlroykjim.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa2FrbG1iaXdpdGxyb3lramltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgxMzg2MiwiZXhwIjoyMDUyMzg5ODYyfQ.IBTdBXb3hjobEUDeMGRNbRKZoavL0Bvgpyoxb1HHr34";
const supabase = createClient(supabaseUrl, supabaseKey);

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10"
  >
    <Icon className="w-8 h-8 mb-4 text-primary" />
    <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
    <p className="text-gray-300 text-sm">{description}</p>
  </motion.div>
);

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clientFormData, setClientFormData] = useState({ email: '', password: '' });
  const [courierFormData, setCourierFormData] = useState({ email: '', password: '' });
  const [customerFormData, setCustomerFormData] = useState({ email: '', password: '' });

  const handleClientSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Query the clients table
      const { data: client, error } = await supabase
        .from('clients')
        .select('id, email, company, status')
        .eq('email', clientFormData.email)
        .eq('password', clientFormData.password)
        .single();

      if (error || !client) {
        throw new Error('Invalid credentials');
      }

      if (client.status !== 'active') {
        throw new Error('Account is not active');
      }

      // Store client data in localStorage
      localStorage.setItem('currentUser', JSON.stringify({
        id: client.id,
        email: client.email,
        company: client.company,
        type: 'client'
      }));
      
      toast.success(`Welcome back, ${client.company}!`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourierSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Query the couriers table
      const { data: courier, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('email', courierFormData.email)
        .single();

      if (error || !courier) {
        throw new Error('Invalid credentials');
      }

      if (courier.password !== courierFormData.password) {
        throw new Error('Invalid credentials');
      }

      // Store courier data in localStorage
      localStorage.setItem('currentCourier', JSON.stringify(courier));
      toast.success(`Welcome back, ${courier.name}!`);
      router.push('/courier');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', customerFormData.email)
        .single();

      if (error || !customer) {
        throw new Error('Invalid credentials');
      }

      if (customer.password !== customerFormData.password) {
        throw new Error('Invalid credentials');
      }

      // Store customer data in localStorage
      localStorage.setItem('currentCustomer', JSON.stringify(customer));
      toast.success(`Welcome, ${customer.name}!`);
      router.push('/customer');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      if (data && data[0]) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-8 py-4 bg-white/80 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="OmniWTMS Logo" className="h-8 w-8" />
          <span className="font-bold text-xl text-gray-800">OmniWTMS</span>
          <span className="ml-2 text-xs text-gray-500">Enterprise Warehouse Management</span>
        </div>
        <nav className="flex gap-6 items-center text-gray-600 text-sm">
          <Link href="#features" className="hover:text-blue-700">Features</Link>
          <Link href="#pricing" className="hover:text-blue-700">Pricing</Link>
          <Link href="#support" className="hover:text-blue-700">Support</Link>
          <Link href="#contact" className="hover:text-blue-700">Contact</Link>
          <Button className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow">Request Demo</Button>
        </nav>
      </header>
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 px-4 py-8 relative">
        {/* Login Card */}
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center z-10">
          <img src="/logo.svg" alt="OmniWTMS Logo" className="h-12 w-12 mb-2" />
          <h2 className="text-xl font-bold mb-1 text-gray-800">OmniWTMS</h2>
          <p className="text-xs text-gray-500 mb-6">Cloud-based Warehouse Management System</p>
          <Tabs defaultValue="client" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 rounded-lg overflow-hidden">
              <TabsTrigger value="client" className="text-sm py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Organization</TabsTrigger>
              <TabsTrigger value="customer" className="text-sm py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Customer</TabsTrigger>
              <TabsTrigger value="courier" className="text-sm py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Courier</TabsTrigger>
            </TabsList>
            <TabsContent value="client">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-700 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v4a1 1 0 001 1h3m10-5h3a1 1 0 011 1v4a1 1 0 01-1 1h-3m-10 0v6a2 2 0 002 2h8a2 2 0 002-2v-6m-10 0h10" /></svg>
                Organization Portal<br />Access your organization's warehouse management dashboard
              </div>
                  <form onSubmit={handleClientSignIn} className="space-y-4">
                      <Input
                        id="client-email"
                        type="email"
                  placeholder="Email"
                        value={clientFormData.email}
                        onChange={(e) => setClientFormData(prev => ({ ...prev, email: e.target.value }))}
                        required
                  className="bg-gray-50 border border-gray-200"
                      />
                      <Input
                        id="client-password"
                        type="password"
                  placeholder="Password"
                        value={clientFormData.password}
                        onChange={(e) => setClientFormData(prev => ({ ...prev, password: e.target.value }))}
                        required
                  className="bg-gray-50 border border-gray-200"
                />
                    <p className='text-sm'>Don&apos;t have an account?<Link className='ml-2 text-blue-700' href={"/auth/signup"}>Create Now !</Link></p>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow" disabled={isLoading}>
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="customer">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-700 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 15c2.21 0 4.304.534 6.121 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Customer Portal<br />Login with credentials provided by your organization
                    </div>
              <form onSubmit={handleCustomerSignIn} className="space-y-4">
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="Email"
                  value={customerFormData.email}
                  onChange={(e) => setCustomerFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="bg-gray-50 border border-gray-200"
                />
                <Input
                  id="customer-password"
                  type="password"
                  placeholder="Password"
                  value={customerFormData.password}
                  onChange={(e) => setCustomerFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="bg-gray-50 border border-gray-200"
                />
                

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow" disabled={isLoading}>
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                    </Button>
                  </form>
            </TabsContent>
            <TabsContent value="courier">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-700 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2M9 17v2a4 4 0 004 4h2a4 4 0 004-4v-2" /></svg>
                Courier Portal<br />Access your delivery management portal
              </div>
                  <form onSubmit={handleCourierSignIn} className="space-y-4">
                      <Input
                        id="courier-email"
                        type="email"
                  placeholder="Email"
                        value={courierFormData.email}
                        onChange={(e) => setCourierFormData(prev => ({ ...prev, email: e.target.value }))}
                        required
                  className="bg-gray-50 border border-gray-200"
                      />
                      <Input
                        id="courier-password"
                        type="password"
                  placeholder="Password"
                        value={courierFormData.password}
                        onChange={(e) => setCourierFormData(prev => ({ ...prev, password: e.target.value }))}
                        required
                  className="bg-gray-50 border border-gray-200"
                      />
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow" disabled={isLoading}>
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                    </Button>
                  </form>
            </TabsContent>
          </Tabs>
        </div>
        {/* Right Side - Features */}
        <div className="flex-1 flex flex-col items-center lg:items-start justify-center px-4 max-w-2xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 mt-8 lg:mt-0">Next-Gen Warehouse Management Solution</h2>
          <p className="text-gray-600 mb-8 max-w-xl">
            Streamline operations, boost productivity, and gain real-time visibility into your warehouse activities with our cloud-based platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2">
              <span className="text-blue-600 font-bold text-lg flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2M9 17v2a4 4 0 004 4h2a4 4 0 004-4v-2" /></svg>Real-time Analytics</span>
              <span className="text-gray-500 text-sm">Monitor KPIs and warehouse performance metrics in real-time with customizable dashboards.</span>
            </div>
            <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2">
              <span className="text-blue-600 font-bold text-lg flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v4a1 1 0 001 1h3m10-5h3a1 1 0 011 1v4a1 1 0 01-1 1h-3m-10 0v6a2 2 0 002 2h8a2 2 0 002-2v-6m-10 0h10" /></svg>Inventory Tracking</span>
              <span className="text-gray-500 text-sm">Track inventory movements and stock levels with precision across multiple warehouses.</span>
            </div>
            <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2">
              <span className="text-blue-600 font-bold text-lg flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2M9 17v2a4 4 0 004 4h2a4 4 0 004-4v-2" /></svg>Business Intelligence</span>
              <span className="text-gray-500 text-sm">Advanced reporting tools to turn data into actionable business insights.</span>
            </div>
            <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2">
              <span className="text-blue-600 font-bold text-lg flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2-2z" /></svg>Secure Access</span>
              <span className="text-gray-500 text-sm">Role-based permissions system ensuring data security across your organization.</span>
            </div>
          </div>
          <div className="flex gap-4 mt-8 text-sm text-gray-500 items-center">
            <span className="flex items-center gap-1"><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Trusted by 500+ enterprises worldwide</span>
            <span className="flex items-center gap-1"><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>99.9% uptime with 24/7 support</span>
          </div>
      </div>
        {/* Subtle background shapes */}
        <div className="absolute left-0 top-0 w-96 h-96 bg-blue-200 rounded-full opacity-30 blur-3xl -z-10" style={{ filter: 'blur(80px)' }} />
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-indigo-200 rounded-full opacity-30 blur-3xl -z-10" style={{ filter: 'blur(80px)' }} />
      </main>
    </div>
  );
} 