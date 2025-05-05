'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Truck, Warehouse, TrendingUp, ArrowLeftRight, PackageX, TrendingDown, Clock, AlertCircle, CheckCircle2, Activity, BarChart3 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "react-hot-toast";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface WarehouseActivity {
  date: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  type: string;
}

interface DashboardStats {
  products: {
    total: number;
    daily: Array<{ date: string; count: number }>;
    trend: number;
    addedToday: number;
    addedYesterday: number;
    addedThisWeek: number;
  };
  deliveries: {
    total: number;
    byStatus: Record<string, number>;
    daily: Array<{ date: string; count: number }>;
  };
  couriers: {
    total: number;
    active: number;
    daily: Array<{ date: string; count: number }>;
    byStatus: Record<string, number>;
    totalDeliveries: number;
    averageCapacity: number;
  };
  warehouse: {
    total: number;
    byStatus: Record<string, number>;
    utilization: Array<{ name: string; utilization: number }>;
    totalWarehouses: number;
    totalStocks: number;
    stocksByWarehouse: Array<{ name: string; quantity: number }>;
    warehouseGrowth: Array<{ date: string; count: number }>;
    recentActivities: WarehouseActivity[];
    movementStats: {
      totalAssignments: number;
      totalTransfers: number;
      totalRemovals: number;
    };
  };
}

// Add these helper functions before the DashboardPage component
const calculateTotalStocks = (warehouses: any[]) => {
  return warehouses.reduce((total, warehouse) => {
    const warehouseStocks = warehouse.stocks || [];
    const stocksTotal = warehouseStocks.reduce((sum: number, stock: any) => {
      return sum + (stock.quantity || 0);
    }, 0);
    return total + stocksTotal;
  }, 0);
};

const processStocksByWarehouse = (warehouses: any[]) => {
  return warehouses.map(warehouse => ({
    name: warehouse.name,
    quantity: (warehouse.stocks || []).reduce((sum: number, stock: any) => 
      sum + (stock.quantity || 0), 0
    )
  }));
};

// Fix warehouse utilization calculation
const processWarehouseUtilization = (warehouses: any[]) => {
  return warehouses.map(warehouse => {
    const totalStock = (warehouse.stocks || []).reduce((sum: number, stock: any) => 
      sum + (stock.quantity || 0), 0
    );
    const capacity = warehouse.capacity || 100;
    const utilization = (totalStock / capacity) * 100;
    return {
      name: warehouse.name,
      utilization: Math.min(utilization, 100) // Cap at 100%
    };
  });
};

// Add this function after the imports
const inspectDatabase = async (supabase: any) => {
  console.log('🔍 Starting Database Inspection');

  try {
    // Check Couriers Table First
    const { data: couriersInfo, error: couriersError } = await supabase
      .from('courier')  // Try 'courier' table
      .select('*')
      .limit(1);

    if (couriersError || !couriersInfo) {
      // If 'courier' fails, try 'couriers'
      const { data: couriersInfo2, error: couriersError2 } = await supabase
        .from('couriers')
        .select('*')
        .limit(1);
      
      console.log('🚚 Couriers Table Structure:', 
        couriersInfo2 ? Object.keys(couriersInfo2[0] || {}) : 'No data',
        'Error:', couriersError2,
        'Raw Data:', couriersInfo2
      );
    } else {
      console.log('🚚 Couriers Table Structure:', 
        Object.keys(couriersInfo[0] || {}),
        'Raw Data:', couriersInfo
      );
    }

    // Check Warehouses Table
    const { data: warehousesInfo, error: warehousesError } = await supabase
      .from('warehouses')
      .select('*')
      .limit(1);
    console.log('📦 Warehouses Table Structure:', 
      warehousesInfo ? Object.keys(warehousesInfo[0] || {}) : 'No data',
      'Error:', warehousesError
    );

    // Check Warehouse Inventory Table
    const { data: inventoryInfo, error: inventoryError } = await supabase
      .from('warehouse_inventory')
      .select('*')
      .limit(1);
    console.log('📋 Warehouse Inventory Table Structure:', 
      inventoryInfo ? Object.keys(inventoryInfo[0] || {}) : 'No data',
      'Error:', inventoryError
    );

    // Check Stock/Inventory Movements Table
    const { data: movementsInfo, error: movementsError } = await supabase
      .from('inventory_movements')
      .select('*')
      .limit(1);
    console.log('🔄 Movements Table Structure:', 
      movementsInfo ? Object.keys(movementsInfo[0] || {}) : 'No data',
      'Error:', movementsError
    );

    // Check Products Table
    const { data: productsInfo, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    console.log('📦 Products Table Structure:', 
      productsInfo ? Object.keys(productsInfo[0] || {}) : 'No data',
      'Error:', productsError
    );

    // Check Clients Table
    const { data: clientsInfo, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);
    console.log('👥 Clients Table Structure:', 
      clientsInfo ? Object.keys(clientsInfo[0] || {}) : 'No data',
      'Error:', clientsError
    );

    // Try alternative table names
    const alternativeTables = [
      'warehouse_stocks',
      'stock_movements',
      'stock_inventory',
      'warehouses_inventory',
      'movements'
    ];

    for (const table of alternativeTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      if (data) {
        console.log(`✅ Found alternative table ${table}:`, Object.keys(data[0] || {}));
      }
    }

  } catch (error) {
    console.error('❌ Database inspection error:', error);
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const [clientData, setClientData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    products: { 
      total: 0, 
      daily: [], 
      trend: 0, 
      addedToday: 0, 
      addedYesterday: 0, 
      addedThisWeek: 0 
    },
    deliveries: { 
      total: 0, 
      byStatus: {}, 
      daily: [] 
    },
    couriers: {
      total: 0,
      active: 0,
      daily: [],
      byStatus: {},
      totalDeliveries: 0,
      averageCapacity: 0
    },
    warehouse: {
      total: 0,
      byStatus: {},
      utilization: [],
      totalWarehouses: 0,
      totalStocks: 0,
      stocksByWarehouse: [],
      warehouseGrowth: [],
      recentActivities: [],
      movementStats: {
        totalAssignments: 0,
        totalTransfers: 0,
        totalRemovals: 0
      }
    }
  });
  const supabase = createClientComponentClient();

  // Enhanced client authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      try {
        const userData = JSON.parse(currentUser);
        if (!userData.id) {
          router.push('/auth/login');
          return;
        }

        // Verify client exists in database
        const { data: clientCheck, error } = await supabase
          .from('clients')
          .select('id, company')
          .eq('id', userData.id)
          .single();

        if (error || !clientCheck) {
          console.error('Client verification failed:', error);
          localStorage.removeItem('currentUser');
          router.push('/auth/login');
          return;
        }

        setClientData(userData);
        
        // Load cached dashboard data if available
        const cachedStats = localStorage.getItem(`dashboard_stats_${userData.id}`);
        if (cachedStats) {
          try {
            const parsedStats = JSON.parse(cachedStats);
            setStats(parsedStats);
          } catch (e) {
            console.error('Error parsing cached stats:', e);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router, supabase]);

  // Update the useEffect to call inspectDatabase
  useEffect(() => {
    if (clientData?.id) {
      console.log('🔑 Client ID:', clientData.id);
      inspectDatabase(supabase).then(() => {
        fetchDashboardData();
      });
    }
  }, [clientData?.id]);

  const fetchDashboardData = async () => {
    if (!clientData?.id) return;
    setIsLoading(true);

    try {
      // First verify the client exists and log current user
      const currentUser = localStorage.getItem('currentUser');
      const userData = JSON.parse(currentUser || '{}');
      console.log('🔍 Current User Data:', userData);
      console.log('🔑 Fetching data for client ID:', clientData.id);

      // Get couriers with detailed logging
      console.log('🔍 Attempting to fetch couriers for client:', clientData.id);
      const { data: couriersData, error: couriersError } = await supabase
        .from('couriers')  // Changed from 'courier' to 'couriers'
        .select('*')
        .eq('client_id', clientData.id);

      // Log raw courier data for debugging
      console.log('📊 Raw Couriers Data:', couriersData);

      if (couriersError) {
        console.error('❌ Couriers fetch error:', couriersError);
        toast.error('Error fetching couriers: ' + couriersError.message);
        throw couriersError;
      }

      // Ensure we have the couriers array and log the count
      const clientCouriers = couriersData || [];
      console.log(`📊 Found ${clientCouriers.length} couriers for client ${clientData.id}`);
      
      // Calculate courier statistics
      const courierStats = {
        total: clientCouriers.length,
        active: clientCouriers.filter(c => c.status === 'active').length,
        daily: processDaily(clientCouriers, 'created_at'),
        byStatus: clientCouriers.reduce((acc: Record<string, number>, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {}),
        totalDeliveries: clientCouriers.reduce((sum, c) => sum + (Number(c.deliveries_completed) || 0), 0),
        averageCapacity: Math.round(clientCouriers.reduce((sum, c) => sum + (Number(c.max_capacity) || 0), 0) / clientCouriers.length) || 0
      };

      // Log processed courier stats
      console.log('📈 Processed Courier Stats:', {
        totalCouriers: courierStats.total,
        activeCouriers: courierStats.active,
        deliveriesCompleted: courierStats.totalDeliveries,
        avgCapacity: courierStats.averageCapacity,
        statusBreakdown: courierStats.byStatus
      });

      // Get warehouses with their inventory movements
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select(`
          *,
          inventory_movements (*)
        `)
        .eq('client_id', clientData.id);

      if (warehousesError) {
        console.error('Warehouse fetch error:', warehousesError);
        throw warehousesError;
      }

      // Get products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', clientData.id);

      if (productsError) {
        console.error('Products fetch error:', productsError);
        throw productsError;
      }

      // Get deliveries
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', clientData.id);

      if (deliveriesError) {
        console.error('Deliveries fetch error:', deliveriesError);
        throw deliveriesError;
      }

      // Ensure we have arrays even if data is null
      const warehouses = warehousesData || [];
      const products = productsData || [];
      const deliveries = deliveriesData || [];
      const couriers = clientCouriers;

      // Log courier data for debugging
      console.log('Raw courier data:', {
        total: couriers.length,
        data: couriers,
        // @ts-expect-error jknkj
        statuses: [...new Set(couriers.map(c => c.status))],
        activeCount: couriers.filter(c => c.status === 'active').length
      });

      // Calculate daily stats for products with proper aggregation
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      // Process courier daily stats
      const courierDaily = processDaily(couriers, 'created_at');
      console.log('Processed courier daily stats:', courierDaily);

      // Create new stats object with aggregated data
      const newStats: DashboardStats = {
        products: {
          total: products.length,
          daily: processDaily(products, 'created_at'),
          trend: calculateTrend(
            products.filter(p => p.created_at?.startsWith(today)).length,
            products.filter(p => p.created_at?.startsWith(yesterday)).length
          ),
          addedToday: products.filter(p => p.created_at?.startsWith(today)).length,
          addedYesterday: products.filter(p => p.created_at?.startsWith(yesterday)).length,
          addedThisWeek: products.filter(p => {
            const date = new Date(p.created_at);
            return date >= new Date(weekAgo);
          }).length
        },
        deliveries: {
          total: deliveries.length,
          byStatus: deliveries.reduce((acc: Record<string, number>, d) => {
            acc[d.status] = (acc[d.status] || 0) + 1;
            return acc;
          }, {}),
          daily: processDaily(deliveries, 'created_at')
        },
        couriers: {
          total: couriers.length,
          active: couriers.filter(c => c.status === 'active').length,
          daily: courierDaily,
          byStatus: courierStats.byStatus,
          totalDeliveries: courierStats.totalDeliveries,
          averageCapacity: courierStats.averageCapacity
        },
        warehouse: {
          total: warehouses.length,
          byStatus: warehouses.reduce((acc: Record<string, number>, w) => {
            acc[w.status] = (acc[w.status] || 0) + 1;
            return acc;
          }, {}),
          utilization: warehouses.map(w => ({
            name: w.name,
            utilization: (w.products / w.capacity) * 100
          })),
          totalWarehouses: warehouses.length,
          totalStocks: warehouses.reduce((sum, w) => sum + (w.products || 0), 0),
          stocksByWarehouse: warehouses.map(w => ({
            name: w.name,
            quantity: w.products || 0
          })),
          warehouseGrowth: processDaily(warehouses, 'created_at'),
          recentActivities: warehouses
            .flatMap(w => (w.inventory_movements || [])
              .map((m:any) => ({
                date: new Date(m.timestamp).toLocaleDateString(),
                productName: products.find(p => p.id === m.product_id)?.name || 'Unknown Product',
                warehouseName: w.name,
                quantity: m.quantity,
                type: m.movement_type
              })))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10),
          movementStats: {
            totalAssignments: warehouses.reduce((sum, w) => 
              sum + (w.inventory_movements || []).filter((m:any) => m.movement_type === 'in').length, 0),
            totalTransfers: warehouses.reduce((sum, w) => 
              sum + (w.inventory_movements || []).filter((m :any)=> m.movement_type === 'transfer').length, 0),
            totalRemovals: warehouses.reduce((sum, w) => 
              sum + (w.inventory_movements || []).filter((m:any) => m.movement_type === 'out').length, 0)
          }
        }
      };

      console.log('Final courier stats:', newStats.couriers);

      setStats(newStats);
      setIsLoading(false);

      // Cache the dashboard data
      localStorage.setItem(`dashboard_stats_${clientData.id}`, JSON.stringify(newStats));

    } catch (error) {
      console.error('Error in fetchDashboardData:', error);
      toast.error('Failed to load dashboard data');
      setIsLoading(false);
    }
  };

  // Helper function to calculate trend
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Helper function to process daily data - updated to aggregate counts by date
  const processDaily = (data: any[], dateField: string) => {
    if (!data || data.length === 0) return [];

    // Get the latest date from the data
    const latestDate = new Date(Math.max(...data.map(item => new Date(item[dateField]).getTime())));
    
    // Generate last 7 days relative to the latest date
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(latestDate);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    // Aggregate counts by day
    const countsByDay = data.reduce((acc: Record<string, number>, item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Map to the required format with aggregated counts
    return last7Days.map(date => ({
      date,
      count: countsByDay[date] || 0
    }));
  };

  // Setup real-time subscriptions with enhanced error handling
  useEffect(() => {
    if (!clientData?.id) return;

    let retryCount = 0;
    const maxRetries = 3;
    
    const setupSubscription = () => {
      try {
        const channel = supabase.channel(`client-${clientData.id}-dashboard`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'deliveries',
              filter: `client_id=eq.${clientData.id}`
            },
            () => fetchDashboardData()
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'warehouses',
              filter: `client_id=eq.${clientData.id}`
            },
            () => fetchDashboardData()
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'products',
              filter: `client_id=eq.${clientData.id}`
            },
            () => fetchDashboardData()
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'stock_movements',
              filter: `client_id=eq.${clientData.id}`
            },
            () => fetchDashboardData()
          )
          .subscribe((status) => {
            console.log(`Subscription status for client ${clientData.id}:`, status);
            if (status === 'SUBSCRIBED') {
              fetchDashboardData();
            }
          });

        return () => {
          channel.unsubscribe();
        };
      } catch (error) {
        console.error('Subscription error:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupSubscription, 1000 * retryCount);
        }
      }
    };

    return setupSubscription();
  }, [clientData?.id]);

  // Show loading or authentication states
  if (!clientData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view your dashboard</h2>
          <Button onClick={() => router.push('/auth/login')}>Log In</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const groupByDay = (data: any[]) => {
    return data.reduce((acc: any, item) => {
      const date = new Date(item.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
  };

  const countByStatus = (data: any[]) => {
    return data.reduce((acc: any, item) => {
      const status = item.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  };

  const processWarehouseGrowth = (data: any[]) => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const warehousesByDay = data.reduce((acc: any, warehouse) => {
      const date = new Date(warehouse.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return last7Days.map(date => ({
      date,
      count: warehousesByDay[date] || 0
    }));
  };

  const calculateTrends = (data: any[], field: string) => {
    if (!data || data.length < 2) return 0;
    const latest = data[0][field];
    const previous = data[1][field];
    return previous ? ((latest - previous) / previous) * 100 : 0;
  };

  const getActivityStatus = (activity: WarehouseActivity) => {
    switch(activity.type) {
      case 'in': return { color: 'bg-green-500', label: 'Assignment' };
      case 'out': return { color: 'bg-red-500', label: 'Removal' };
      case 'transfer': return { color: 'bg-blue-500', label: 'Transfer' };
      default: return { color: 'bg-gray-500', label: 'Unknown' };
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Monitor your logistics operations in real-time</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => fetchDashboardData()}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Activity className="h-4 w-4" />
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.deliveries.total}</div>
            <div className="text-sm text-gray-500 mt-1">
              Completed: {stats.deliveries.byStatus.completed || 0}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">On-Time Rate</span>
                <span className="text-green-600 font-medium">95%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Warehouse Capacity</CardTitle>
            <Warehouse className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.warehouse.totalWarehouses} Units
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {stats.warehouse.totalStocks} Items Stored
            </div>
            <div className="mt-4">
              <Progress 
                value={stats.warehouse.utilization[0]?.utilization || 0} 
                className="h-2 bg-blue-100"
              />
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Utilization</span>
                <span>{Math.round(stats.warehouse.utilization[0]?.utilization || 0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.products.total}</div>
            <div className="text-sm text-gray-500 mt-1">
              Added this week: {stats.products.addedThisWeek}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Stock Health</span>
                <span className="text-green-600 font-medium">Good</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        {/* Delivery Trends */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Delivery Performance</CardTitle>
            <CardDescription>Track delivery trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.deliveries.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    stroke="#6B7280"
                  />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#4F46E5" 
                    strokeWidth={2}
                    dot={{ fill: '#4F46E5', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Activity */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Warehouse Activity</CardTitle>
            <CardDescription>Monitor warehouse utilization trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.warehouse.warehouseGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    stroke="#6B7280"
                  />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {/* Delivery Status */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Delivery Status</CardTitle>
            <CardDescription>Current delivery status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Pending', value: stats.deliveries.byStatus.pending || 0 },
                      { name: 'In Progress', value: stats.deliveries.byStatus.in_progress || 0 },
                      { name: 'Completed', value: stats.deliveries.byStatus.completed || 0 },
                      { name: 'Failed', value: stats.deliveries.byStatus.failed || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#EAB308" />
                    <Cell fill="#3B82F6" />
                    <Cell fill="#22C55E" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <CardDescription>Latest logistics operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.warehouse.recentActivities.slice(0, 5).map((activity, index) => {
                const status = getActivityStatus(activity);
                return (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.productName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {status.label} at {activity.warehouseName}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {activity.quantity} units
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 