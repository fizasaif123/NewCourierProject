'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReportGeneratorProps {
  warehouseData: any[];
  monthlyOrderData: any[];
  orderStatusData: any[];
}

export function ReportGenerator({ warehouseData, monthlyOrderData, orderStatusData }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate report generation delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Prepare report data based on type
      let reportData = '';
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      
      switch (reportType) {
        case 'revenue':
          reportData = generateRevenueReport();
          break;
        case 'warehouse':
          reportData = generateWarehouseReport();
          break;
        case 'courier':
          reportData = generateCourierReport();
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Create and download the report file
      const blob = new Blob([reportData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wcms_${reportType}_report_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateRevenueReport = () => {
    let csv = 'Month,Orders,Revenue\n';
    monthlyOrderData.forEach(data => {
      csv += `${data.month},${data.orders},${data.revenue}\n`;
    });
    return csv;
  };

  const generateWarehouseReport = () => {
    let csv = 'Warehouse Name,Location,Monthly Revenue,Utilization %\n';
    warehouseData.forEach(warehouse => {
      csv += `${warehouse.name},${warehouse.location},${warehouse.revenue},${warehouse.utilization}\n`;
    });
    return csv;
  };

  const generateCourierReport = () => {
    let csv = 'Status,Count,Percentage\n';
    const total = orderStatusData.reduce((sum, item) => sum + item.value, 0);
    orderStatusData.forEach(status => {
      const percentage = ((status.value / total) * 100).toFixed(2);
      csv += `${status.name},${status.value},${percentage}%\n`;
    });
    return csv;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Monthly Revenue Trends</SelectItem>
                <SelectItem value="warehouse">Warehouse Utilization</SelectItem>
                <SelectItem value="courier">Courier Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Report Preview</h3>
            <div className="p-4 bg-secondary rounded-lg">
              {reportType === 'revenue' && (
                <p className="text-sm">
                  Monthly revenue and order trends across all warehouses, including:
                  <br />• Monthly order volumes
                  <br />• Revenue figures
                  <br />• Growth trends
                </p>
              )}
              {reportType === 'warehouse' && (
                <p className="text-sm">
                  Detailed warehouse performance metrics, including:
                  <br />• Utilization rates
                  <br />• Revenue per warehouse
                  <br />• Location analysis
                </p>
              )}
              {reportType === 'courier' && (
                <p className="text-sm">
                  Courier and delivery performance stats, including:
                  <br />• Delivery status distribution
                  <br />• Success rates
                  <br />• Performance metrics
                </p>
              )}
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={generateReport}
            disabled={!reportType || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}