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
import { Download, FileText, Package, Warehouse, Truck, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { Progress } from "@/components/ui/progress";

interface ReportStats {
  products: {
    total: number;
    addedToday: number;
    addedThisWeek: number;
    addedThisMonth: number;
  };
  warehouse: {
    total: number;
    totalStocks: number;
    utilization: { name: string; utilization: number }[];
  };
  deliveries: {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
    pending: number;
    daily: { date: string; count: number }[];
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
    warehouse: { total: 0, totalStocks: 0, utilization: [] },
    deliveries: { total: 0, completed: 0, inProgress: 0, failed: 0, pending: 0, daily: [] },
    timeline: []
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType]);

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

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Activity Report', 15, 20);
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 15, 30);

    // Add Products Statistics
    doc.setFontSize(16);
    doc.text('Products Statistics', 15, 45);
    
    let yPos = 50;
    
    autoTable(doc, {
      startY: yPos,
      theme: 'grid',
      head: [['Metric', 'Count']],
      body: [
        ['Total Products', stats.products.total.toString()],
        ['Added Today', stats.products.addedToday.toString()],
        ['Added This Week', stats.products.addedThisWeek.toString()],
        ['Added This Month', stats.products.addedThisMonth.toString()]
      ],
      margin: { left: 15 }
    });

    // Get the last Y position and add some padding
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Add Warehouse Statistics
    doc.setFontSize(16);
    doc.text('Warehouse Statistics', 15, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      theme: 'grid',
      head: [['Metric', 'Count']],
      body: [
        ['Total Items', stats.warehouse.total.toString()],
        ['Total Stocks', stats.warehouse.totalStocks.toString()],
        ['Utilization', stats.warehouse.utilization.length.toString()]
      ],
      margin: { left: 15 }
    });

    // Update Y position for next section
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Add Delivery Statistics
    doc.setFontSize(16);
    doc.text('Delivery Statistics', 15, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      theme: 'grid',
      head: [['Metric', 'Count']],
      body: [
        ['Total Deliveries', stats.deliveries.total.toString()],
        ['Completed', stats.deliveries.completed.toString()],
        ['In Progress', stats.deliveries.inProgress.toString()],
        ['Failed', stats.deliveries.failed.toString()],
        ['Pending', stats.deliveries.pending.toString()]
      ],
      margin: { left: 15 }
    });

    // Add Timeline on new page
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Activity Timeline', 15, 20);
    
    const timelineData = stats.timeline.map(activity => [
      format(new Date(activity.date), 'MMM dd, HH:mm'),
      activity.activity,
      activity.details,
      activity.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 25,
      theme: 'grid',
      head: [['Time', 'Activity', 'Details', 'Status']],
      body: timelineData,
      styles: { 
        overflow: 'linebreak',
        fontSize: 9,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 90 },
        3: { cellWidth: 25 }
      },
      margin: { left: 15 }
    });

    // Save the PDF
    doc.save(`report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const fetchReportData = async () => {
    try {
      // First verify the client exists and log current user
      const currentUser = localStorage.getItem('currentUser');
      const userData = JSON.parse(currentUser || '{}');
      console.log('🔍 Current User Data:', userData);

      // Get products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', userData.id);

      if (productsError) throw productsError;

      // Get warehouses with their inventory movements
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select(`
          *,
          inventory_movements (*)
        `)
        .eq('client_id', userData.id);

      if (warehousesError) throw warehousesError;

      // Get deliveries
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', userData.id);

      if (deliveriesError) throw deliveriesError;

      // Ensure we have arrays even if data is null
      const warehouses = warehousesData || [];
      const products = productsData || [];
      const deliveries = deliveriesData || [];

      // Calculate statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const productsStats = {
        total: products.length,
        addedToday: products.filter(p => new Date(p.created_at) >= today).length,
        addedThisWeek: products.filter(p => new Date(p.created_at) >= thisWeek).length,
        addedThisMonth: products.filter(p => new Date(p.created_at) >= thisMonth).length
      };

      const warehouseStats = {
        total: warehouses.length,
        totalStocks: warehouses.reduce((sum, w) => sum + (w.products || 0), 0),
        utilization: warehouses.map(w => ({
          name: w.name,
          utilization: (w.products / (w.capacity || 100)) * 100
        }))
      };

      const deliveriesStats = {
        total: deliveries.length,
        completed: deliveries.filter(d => d.status === 'completed').length,
        inProgress: deliveries.filter(d => d.status === 'in_progress').length,
        failed: deliveries.filter(d => d.status === 'failed').length,
        pending: deliveries.filter(d => d.status === 'pending').length,
        daily: processDaily(deliveries, 'created_at')
      };

      // Generate timeline with enhanced activities
      const timeline = [
        ...products.map(p => ({
          date: p.created_at,
          activity: 'Product Added',
          details: `Product: ${p.name}, Quantity: ${p.quantity || 0}`,
          status: 'success'
        })),
        ...warehouses.flatMap(w => (w.inventory_movements || []).map((m:any) => ({
          date: m.timestamp,
          activity: 'Warehouse Movement',
          details: `Warehouse: ${w.name}, Type: ${m.movement_type}, Quantity: ${m.quantity}`,
          status: m.movement_type
        }))),
        ...deliveries.map(d => ({
          date: d.created_at,
          activity: 'Delivery',
          details: `From: ${d.pickup_address?.split(',')[0]} To: ${d.delivery_address?.split(',')[0]}`,
          status: d.status
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStats({
        products: productsStats,
        warehouse: {
          ...warehouseStats,
          // @ts-expect-error jk kj
          assigned: warehouses.filter(w => w.status === 'assigned').length,
          pending: warehouses.filter(w => w.status === 'pending').length
        },
        deliveries: deliveriesStats,
        timeline
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    }
  };

  // Helper function to process daily data
  const processDaily = (data: any[], dateField: string) => {
    if (!data || data.length === 0) return [];

    const latestDate = new Date(Math.max(...data.map(item => new Date(item[dateField]).getTime())));
    
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(latestDate);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const countsByDay = data.reduce((acc: Record<string, number>, item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return last7Days.map(date => ({
      date,
      count: countsByDay[date] || 0
    }));
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Download detailed reports of your operations</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={downloadReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download JSON
          </Button>
          <Button onClick={downloadPDF} variant="secondary" className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Products Overview</CardTitle>
            <Package className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.products.total}</div>
            <div className="text-sm text-gray-500 mt-1">
              Added this month: {stats.products.addedThisMonth}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span>Added Today</span>
                <span className="font-medium">{stats.products.addedToday}</span>
              </div>
              <div className="flex justify-between">
                <span>Added This Week</span>
                <span className="font-medium">{stats.products.addedThisWeek}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Warehouse Status</CardTitle>
            <Warehouse className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.warehouse.total} Units</div>
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

        <Card className="bg-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
            <Truck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.deliveries.total}</div>
            <div className="text-sm text-gray-500 mt-1">
              Completed: {stats.deliveries.completed}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span>In Progress</span>
                <span className="font-medium text-blue-600">{stats.deliveries.inProgress}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending</span>
                <span className="font-medium text-orange-600">{stats.deliveries.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed</span>
                <span className="font-medium text-red-600">{stats.deliveries.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Activity Timeline
          </CardTitle>
          <CardDescription>Recent activities and status changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.timeline.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="min-w-[100px] text-sm text-muted-foreground">
                  {format(new Date(activity.date), 'MMM dd, HH:mm')}
                </div>
                <div className={`w-2 h-2 mt-2 rounded-full ${
                  activity.status === 'completed' || activity.status === 'success' ? 'bg-green-500' :
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