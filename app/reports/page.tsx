'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { format } from 'date-fns';

interface ReportStats {
  products: {
    total: number;
    addedToday: number;
    addedThisWeek: number;
    addedThisMonth: number;
  };
  warehouse: {
    total: number;
    assigned: number;
    pending: number;
  };
  deliveries: {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
    pending: number;
  };
  timeline: {
    date: string;
    activity: string;
    details: string;
    status: string;
  }[];
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [reportType, setReportType] = useState('all');
  const [stats, setStats] = useState<ReportStats>({
    products: { total: 0, addedToday: 0, addedThisWeek: 0, addedThisMonth: 0 },
    warehouse: { total: 0, assigned: 0, pending: 0 },
    deliveries: { total: 0, completed: 0, inProgress: 0, failed: 0, pending: 0 },
    timeline: []
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType]);

  const fetchReportData = async () => {
    try {
      // Fetch products statistics
      const { data: products } = await supabase
        .from('products')
        .select('created_at, quantity');
      
      // Fetch warehouse assignments
      const { data: warehouseAssignments } = await supabase
        .from('warehouse_inventory')
        .select('*');
      
      // Fetch deliveries
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('*');

      // Calculate statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const productsStats = {
        total: products?.length || 0,
        addedToday: products?.filter(p => new Date(p.created_at) >= today).length || 0,
        addedThisWeek: products?.filter(p => new Date(p.created_at) >= thisWeek).length || 0,
        addedThisMonth: products?.filter(p => new Date(p.created_at) >= thisMonth).length || 0
      };

      const warehouseStats = {
        total: warehouseAssignments?.length || 0,
        assigned: warehouseAssignments?.filter(w => w.status === 'assigned').length || 0,
        pending: warehouseAssignments?.filter(w => w.status === 'pending').length || 0
      };

      const deliveriesStats = {
        total: deliveries?.length || 0,
        completed: deliveries?.filter(d => d.status === 'completed').length || 0,
        inProgress: deliveries?.filter(d => d.status === 'in_progress').length || 0,
        failed: deliveries?.filter(d => d.status === 'failed').length || 0,
        pending: deliveries?.filter(d => d.status === 'pending').length || 0
      };

      // Generate timeline
      const timeline = [
        ...(products?.map(p => ({
          date: p.created_at,
          activity: 'Product Added',
          details: `Quantity: ${p.quantity}`,
          status: 'success'
        })) || []),
        ...(deliveries?.map(d => ({
          date: d.created_at,
          activity: 'Delivery Created',
          details: `Status: ${d.status}`,
          status: d.status
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStats({
        products: productsStats,
        warehouse: warehouseStats,
        deliveries: deliveriesStats,
        timeline
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  const downloadReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      reportType,
      statistics: stats
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Reports</h1>
          <p className="text-muted-foreground">
            View detailed statistics and activity timeline
          </p>
        </div>
        <Button onClick={downloadReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download Report
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="deliveries">Deliveries</SelectItem>
          </SelectContent>
        </Select>
        {/* @ts-expect-error jk lk */}
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Products Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Product upload statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Products</span>
                <span className="font-medium">{stats.products.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added Today</span>
                <span className="font-medium">{stats.products.addedToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added This Week</span>
                <span className="font-medium">{stats.products.addedThisWeek}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added This Month</span>
                <span className="font-medium">{stats.products.addedThisMonth}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Warehouse</CardTitle>
            <CardDescription>Warehouse assignment statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium">{stats.warehouse.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned</span>
                <span className="font-medium">{stats.warehouse.assigned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium">{stats.warehouse.pending}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Deliveries</CardTitle>
            <CardDescription>Delivery status statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Deliveries</span>
                <span className="font-medium">{stats.deliveries.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-green-600">{stats.deliveries.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">In Progress</span>
                <span className="font-medium text-blue-600">{stats.deliveries.inProgress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Failed</span>
                <span className="font-medium text-red-600">{stats.deliveries.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium text-orange-600">{stats.deliveries.pending}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Recent activities and status changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.timeline.map((activity, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="min-w-[100px] text-sm text-muted-foreground">
                  {format(new Date(activity.date), 'MMM dd, HH:mm')}
                </div>
                <div className={`w-2 h-2 mt-2 rounded-full ${
                  activity.status === 'completed' ? 'bg-green-500' :
                  activity.status === 'failed' ? 'bg-red-500' :
                  activity.status === 'in_progress' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`} />
                <div>
                  <div className="font-medium">{activity.activity}</div>
                  <div className="text-sm text-muted-foreground">{activity.details}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}