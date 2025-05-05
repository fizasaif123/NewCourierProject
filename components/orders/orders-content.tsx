'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, Eye } from 'lucide-react';

type OrderStatus = 'pending' | 'shipped' | 'delivered';

interface Order {
  id: string;
  productName: string;
  status: OrderStatus;
  deliveryDate: Date;
  customerName: string;
  address: string;
  phone: string;
  email: string;
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  shipped: { label: 'Shipped', className: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
} as const;

// Mock data
const mockOrders: Order[] = Array.from({ length: 50 }, (_, i) => ({
  id: `O${(i + 1).toString().padStart(5, '0')}`,
  productName: `Product ${i + 1}`,
  status: ['pending', 'shipped', 'delivered'][Math.floor(Math.random() * 3)] as OrderStatus,
  deliveryDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
  customerName: `Customer ${i + 1}`,
  address: `${Math.floor(Math.random() * 999) + 1} ${['High Street', 'Main Road', 'Park Avenue'][Math.floor(Math.random() * 3)]}, ${['London', 'Manchester', 'Birmingham'][Math.floor(Math.random() * 3)]}`,
  phone: `+44 ${Math.floor(Math.random() * 10000000000)}`,
  email: `customer${i + 1}@example.com`,
}));

const ITEMS_PER_PAGE = 10;

export function OrdersContent() {
  const [orders] = useState<Order[]>(mockOrders);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'status' | 'deliveryDate' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.productName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortField) return 0;
      
      if (sortField === 'status') {
        return sortDirection === 'asc' 
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      
      return sortDirection === 'asc'
        ? a.deliveryDate.getTime() - b.deliveryDate.getTime()
        : b.deliveryDate.getTime() - a.deliveryDate.getTime();
    });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: 'status' | 'deliveryDate') => {
    if (sortField === field) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Orders</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="hover:bg-transparent"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('deliveryDate')}
                  className="hover:bg-transparent"
                >
                  Delivery Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.productName}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusConfig[order.status].className}>
                    {statusConfig[order.status].label}
                  </Badge>
                </TableCell>
                <TableCell>{format(order.deliveryDate, 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                      </DialogHeader>
                      {selectedOrder && (
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">Order Information</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="font-medium">Order ID</div>
                              <div className="col-span-2">{selectedOrder.id}</div>
                              <div className="font-medium">Product</div>
                              <div className="col-span-2">{selectedOrder.productName}</div>
                              <div className="font-medium">Status</div>
                              <div className="col-span-2">
                                <Badge
                                  variant="secondary"
                                  className={statusConfig[selectedOrder.status].className}
                                >
                                  {statusConfig[selectedOrder.status].label}
                                </Badge>
                              </div>
                              <div className="font-medium">Delivery Date</div>
                              <div className="col-span-2">
                                {format(selectedOrder.deliveryDate, 'dd MMM yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Customer Details</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="font-medium">Name</div>
                              <div className="col-span-2">{selectedOrder.customerName}</div>
                              <div className="font-medium">Address</div>
                              <div className="col-span-2">{selectedOrder.address}</div>
                              <div className="font-medium">Phone</div>
                              <div className="col-span-2">{selectedOrder.phone}</div>
                              <div className="font-medium">Email</div>
                              <div className="col-span-2">{selectedOrder.email}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of{' '}
          {filteredOrders.length} orders
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}