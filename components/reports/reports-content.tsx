'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Loader2, BarChart2, TrendingUp, Truck, Package } from 'lucide-react';
import { format } from 'date-fns';

// Mock data for reports
const mockReports = [
  {
    id: 'R001',
    name: 'Monthly Revenue Report',
    type: 'revenue',
    date: new Date(2024, 2, 15),
    size: '2.4 MB'
  },
  {
    id: 'R002',
    name: 'Warehouse Utilization Report',
    type: 'warehouse',
    date: new Date(2024, 2, 14),
    size: '1.8 MB'
  },
  {
    id: 'R003',
    name: 'Courier Performance Report',
    type: 'courier',
    date: new Date(2024, 2, 13),
    size: '3.1 MB'
  },
  {
    id: 'R004',
    name: 'Inventory Status Report',
    type: 'inventory',
    date: new Date(2024, 2, 12),
    size: '4.2 MB'
  }
];

export function ReportsContent() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [reportFormat, setReportFormat] = useState<string>('csv');

  const handleGenerateReport = async () => {
    if (!selectedReport || !dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Missing Information',
        content: 'Please select a report type and date range.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fileName = `wcms_${selectedReport}_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.${reportFormat}`;
      
      toast({
        title: 'Report Generated',
        content: `${fileName} has been generated successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        content: 'Failed to generate report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return <TrendingUp className="h-4 w-4" />;
      case 'warehouse':
        return <BarChart2 className="h-4 w-4" />;
      case 'courier':
        return <Truck className="h-4 w-4" />;
      case 'inventory':
        return <Package className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue Report</SelectItem>
                    <SelectItem value="warehouse">Warehouse Utilization Report</SelectItem>
                    <SelectItem value="courier">Courier Performance Report</SelectItem>
                    <SelectItem value="inventory">Inventory Status Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                {/* @ts-expect-error jknkj  */}
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                onClick={handleGenerateReport}
                disabled={isGenerating || !selectedReport || !dateRange?.from || !dateRange?.to}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReports.map(report => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getReportIcon(report.type)}
                      <div>
                        <h3 className="font-medium">{report.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Generated on {format(report.date, 'MMM d, yyyy')} • {report.size}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}