'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Truck, TrendingUp, Clock, Activity } from "lucide-react";
import { 
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  ResponsiveContainer,
  CartesianGrid,
  YAxis,
  Legend} from "recharts";
import { format } from 'date-fns';
import dynamic from "next/dynamic";
import { Tooltip } from "../ui/tooltip";

// Dynamically import the Map component with no SSR
const WarehouseMap = dynamic(() => import('./warehouse-map'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/50 rounded-lg">
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  )
});

// Mock data for metrics
const metrics = {
  totalRevenue: 158000,
  averageUtilization: 80,
  totalDeliveries: 1250,
  activeCouriers: 18
};

// Mock data for warehouse revenue trends
const warehouseRevenueTrends = [
  { month: "Jan", london: 25000, manchester: 18000, birmingham: 15000 },
  { month: "Feb", london: 28000, manchester: 20000, birmingham: 17000 },
  { month: "Mar", london: 24000, manchester: 19000, birmingham: 16000 },
  { month: "Apr", london: 30000, manchester: 22000, birmingham: 19000 },
  { month: "May", london: 32000, manchester: 24000, birmingham: 21000 },
  { month: "Jun", london: 29000, manchester: 21000, birmingham: 18000 },
];

// Mock data for warehouse utilization
const warehouseUtilization = [
  { name: "London Warehouse", value: 85, color: '#3B82F6' },
  { name: "Manchester Facility", value: 90, color: '#22C55E' },
  { name: "Birmingham Depot", value: 65, color: '#F59E0B' },
];

// Mock data for delivery completion trends
const deliveryTrends = [
  { date: "Mon", completed: 45, target: 50 },
  { date: "Tue", completed: 52, target: 50 },
  { date: "Wed", completed: 48, target: 50 },
  { date: "Thu", completed: 55, target: 50 },
  { date: "Fri", completed: 51, target: 50 },
  { date: "Sat", completed: 42, target: 50 },
  { date: "Sun", completed: 38, target: 50 },
];

// Mock data for recent activities
const recentActivities = [
  { 
    id: 1, 
    type: 'courier',
    message: "New courier John Smith added", 
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    icon: 'Truck'
  },
  { 
    id: 2, 
    type: 'order',
    message: "Order O56789 delivered to Manchester", 
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    icon: 'Package'
  },
  { 
    id: 3, 
    type: 'warehouse',
    message: "London Warehouse utilization updated to 85%", 
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    icon: 'BarChart'
  },
  { 
    id: 4, 
    type: 'inventory',
    message: "Birmingham Depot received new inventory", 
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    icon: 'Package'
  },
  { 
    id: 5, 
    type: 'courier',
    message: "Courier Jane Smith completed 5 deliveries", 
    timestamp: new Date(Date.now() - 1000 * 60 * 240),
    icon: 'CheckCircle'
  },
];

// Mock data for warehouse locations
const warehouseLocations = [
  { name: "London Warehouse", coordinates: [51.5074, -0.1278], products: 2500, revenue: 32000, utilization: 85 },
  { name: "Manchester Facility", coordinates: [53.4808, -2.2426], products: 1800, revenue: 24000, utilization: 90 },
  { name: "Birmingham Depot", coordinates: [52.4862, -1.8904], products: 2100, revenue: 21000, utilization: 65 },
];

export function DashboardContent() {
  const [data, setData] = useState(warehouseRevenueTrends);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(currentData => 
        currentData.map(item => ({
          ...item,
          london: item.london + Math.floor(Math.random() * 2000 - 1000),
          manchester: item.manchester + Math.floor(Math.random() * 2000 - 1000),
          birmingham: item.birmingham + Math.floor(Math.random() * 2000 - 1000),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-4 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} className="text-sm">
              {pld.name}: {
                typeof pld.value === 'number'
                  ? pld.name.toLowerCase().includes('revenue') || pld.name.includes('£')
                    ? `£${pld.value.toLocaleString()}`
                    : pld.value.toLocaleString()
                  : pld.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatTimestamp = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return format(timestamp, 'MMM d, HH:mm');
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Monthly Revenue</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              £{metrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
            <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {metrics.averageUtilization}%
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">+5% from last week</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 dark:bg-amber-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.totalDeliveries.toLocaleString()}
            </div>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">+8.2% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Couriers</CardTitle>
            <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metrics.activeCouriers}
            </div>
            <p className="text-xs text-purple-600/80 dark:text-purple-400/80">+2 since yesterday</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Warehouse Revenue Trends */}
        <Card className="card-gradient shadow-elevation-2">
          <CardHeader>
            <CardTitle>Warehouse Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] chart-gradient rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  {/* @ts-expect-error kjd jk */}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="london" name="London" fill="#3B82F6" />
                  <Bar dataKey="manchester" name="Manchester" fill="#22C55E" />
                  <Bar dataKey="birmingham" name="Birmingham" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Utilization */}
        <Card className="card-gradient shadow-elevation-2">
          <CardHeader>
            <CardTitle>Warehouse Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] chart-gradient rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={warehouseUtilization}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {warehouseUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  {/* @ts-expect-error kjd jk */}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Completion Trends */}
        <Card className="card-gradient shadow-elevation-2">
          <CardHeader>
            <CardTitle>Delivery Completion Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] chart-gradient rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={deliveryTrends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  {/* @ts-expect-error kjd jk */}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                    name="Completed Deliveries"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#22C55E"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="card-gradient shadow-elevation-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}