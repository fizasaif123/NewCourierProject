'use client';

import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pencil, Trash2, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import  WarehouseForm from './warehouse-form';
import dynamic from 'next/dynamic';
import { rolePermissions } from '@/lib/types/roles';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import { supabase } from './SupabaseClient';

// Dynamically import the Map component
const WarehouseMap = dynamic(() => import('../dashboard/warehouse-map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted/50 rounded-lg">Loading map...</div>
});

const ITEMS_PER_PAGE = 10;

export function WarehousesContent() {
  const [warehouses, setWarehouses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole] = useState('admin');
  // @ts-expect-error kj kj
  const permissions = rolePermissions[userRole];
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [quantities, setQuantities] = useState({});
  const [assignedStocks, setAssignedStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [assignmentSummary, setAssignmentSummary] = useState(null);
  const [stockMovements, setStockMovements] = useState([]);
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  const [labelAddress, setLabelAddress] = useState('');
  const [labelWarehouse, setLabelWarehouse] = useState('');
  const [isLabelGenerated, setIsLabelGenerated] = useState(false);

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
    fetchStockMovements();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select('*');
      
      if (warehousesError) throw warehousesError;

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('warehouse_assignments')
        .select(`
          *,
          products (
            id,
            name
          )
        `);

      if (assignmentsError) throw assignmentsError;

      const warehousesWithAssignments = warehousesData.map(warehouse => ({
        ...warehouse,
        assignedStocks: assignmentsData
          ?.filter(assignment => assignment.warehouse_id === warehouse.id)
          .map((assignment, index) => ({
            ...assignment,
            uniqueKey: `${warehouse.id}-${assignment.product_id}-${index}`
          })) || []
      }));
  // @ts-expect-error kj kj
      setWarehouses(warehousesWithAssignments);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      alert('Failed to fetch warehouses');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) throw error;
  // @ts-expect-error kj kj
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to fetch products');
    }
  };

  const fetchStockMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          warehouses (name),
          products (name)
        `)
        .order('timestamp', { ascending: false });

      if (error) throw error;
  // @ts-expect-error kj kj
      setStockMovements(data || []);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    }
  };

  const handleAddWarehouse = async (data:any) => {
    if (!permissions.canCreateWarehouse) {
      alert('You do not have permission to create warehouses.');
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: newWarehouse, error } = await supabase
        .from('warehouses')
        .insert([{
          name: data.name,
          location: data.location,
          coordinates: data.coordinates || [51.5074, -0.1278], // Default to London if not provided
          capacity: data.capacity || 10000,
          utilization: 0,
          revenue: 0,
          products: 0,
          manager: data.manager,
          contact: data.contact,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      
  // @ts-expect-error kj kj
      setWarehouses(prev => [newWarehouse, ...prev]);
      setShowAddDialog(false);
      alert('Warehouse has been successfully added.');
    } catch (error) {
      console.error('Error adding warehouse:', error);
      alert('Failed to add warehouse. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignStock = async () => {
    if (!selectedWarehouse) {
      alert('Please select a warehouse.');
      return;
    }

    try {
      const newAssignments = Object.entries(quantities)
  // @ts-expect-error kj kj
        .filter(([_, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({
          warehouse_id: selectedWarehouse,
          product_id: productId,
  // @ts-expect-error kj kj
          quantity: parseInt(quantity),
          created_at: new Date().toISOString()
        }));

      if (newAssignments.length === 0) {
        alert('Please specify quantities for at least one product.');
        return;
      }

      // Begin transaction
      for (const assignment of newAssignments) {
        // Get current product quantity
        const { data: currentProduct, error: productFetchError } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', assignment.product_id)
          .single();

        if (productFetchError) throw productFetchError;

        // Check if enough quantity is available
        if (!currentProduct || currentProduct.quantity < assignment.quantity) {
          alert(`Not enough quantity available for product ID ${assignment.product_id}`);
          continue;
        }

        // 1. Insert into warehouse_assignments table
        const { error: assignmentError } = await supabase
          .from('warehouse_assignments')
          .insert([assignment]);

        if (assignmentError) throw assignmentError;

        // 2. Update product quantity by subtracting assigned amount
        const newQuantity = currentProduct.quantity - assignment.quantity;
        const { error: productError } = await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', assignment.product_id);

        if (productError) throw productError;

        // 3. Update warehouse utilization
        const { data: currentWarehouse, error: warehouseFetchError } = await supabase
          .from('warehouses')
          .select('products, utilization')
          .eq('id', assignment.warehouse_id)
          .single();

        if (warehouseFetchError) throw warehouseFetchError;

        const newProducts = (currentWarehouse?.products || 0) + assignment.quantity;
        const utilizationIncrease = Math.ceil((newProducts / 1000) * 100);
        
        const { error: warehouseError } = await supabase
          .from('warehouses')
          .update({ 
            products: newProducts,
            utilization: utilizationIncrease > 100 ? 100 : utilizationIncrease
          })
          .eq('id', assignment.warehouse_id);

        if (warehouseError) throw warehouseError;

        // 4. Record stock movement with unique ID
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            id: crypto.randomUUID(), // Add unique ID
            warehouse_id: assignment.warehouse_id,
            product_id: assignment.product_id,
            quantity: assignment.quantity,
            movement_type: 'assignment',
            timestamp: new Date().toISOString(),
            notes: `Assigned ${assignment.quantity} units to warehouse`
          }]);

        if (movementError) throw movementError;
      }

      // Clear quantities after successful assignment
      setQuantities({});
      setSelectedWarehouse('');
      
      // Refresh data
      await Promise.all([
        fetchProducts(),
        fetchWarehouses(),
        fetchStockMovements()
      ]);

      alert('Stocks assigned successfully!');
    } catch (error) {
      console.error('Error assigning stocks:', error);
      alert('Failed to assign stocks. Please try again.');
    }
  };

  const handleEditAssignment = (assignmentId: string) => {
  // @ts-expect-error kj kj
    const assignment = assignedStocks.find((a) => a.id === assignmentId);
    if (assignment) {
  // @ts-expect-error kj kj
      setSelectedWarehouse(assignment.warehouseId);
  // @ts-expect-error kj kj
      setQuantities({ [assignment.productId]: assignment.quantity });
  // @ts-expect-error kj kj
      setEditingAssignmentId(assignmentId);
      setIsDialogOpen(true);
    }
  };

  const handleUpdateAssignment = () => {
    if (!selectedWarehouse) {
      setAssignmentSummary({
  // @ts-expect-error kj kj
        assigned: [],
        remaining: [],
      });
      return;
    }

    const updatedAssignments = assignedStocks.map((assignment) => {
  // @ts-expect-error kj kj
      if (assignment.id === editingAssignmentId) {
        return {
  // @ts-expect-error kj kj
          ...assignment,
          warehouseId: selectedWarehouse,
  // @ts-expect-error kj kj
          quantity: quantities[assignment.productId] || 0,
        };
      }
      return assignment;
    });

  // @ts-expect-error kj kj
    setAssignedStocks(updatedAssignments);

  // @ts-expect-error kj kj
  const assignment = assignedStocks.find((a) => a.id === editingAssignmentId);
    if (assignment) {
  // @ts-expect-error kj kj
  const product = products.find((p) => p.id === assignment.productId);
  // @ts-expect-error kj kj
  const warehouse = warehouses.find((w) => w.id === selectedWarehouse);
      if (product && warehouse) {
  // @ts-expect-error kj kj
  logStockMovement('Update', `Updated ${quantities[assignment.productId]} of ${product.name} in ${warehouse.name}`);
      }
    }

    setSelectedWarehouse('');
    setQuantities({});
    setEditingAssignmentId(null);

    setAssignmentSummary({
  // @ts-expect-error kj kj
  assigned: [{ productId: editingAssignmentId!.split('-')[0], quantity: quantities[editingAssignmentId!.split('-')[0]], warehouseName: warehouses.find((w) => w.id === selectedWarehouse)?.name || '' }],
      remaining: [],
    });

    setIsDialogOpen(false);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
  // @ts-expect-error kj kj
    const assignment = assignedStocks.find((a) => a.id === assignmentId);
    if (assignment) {
      const updatedProducts = products.map((product) => {
  // @ts-expect-error kj kj
  if (product.id === assignment.productId) {
  // @ts-expect-error kj kj
  return { ...product, quantity: product.quantity + assignment.quantity };
        }
        return product;
      });
  // @ts-expect-error kj kj
  setProducts(updatedProducts);

  // @ts-expect-error kj kj
  setAssignedStocks(assignedStocks.filter((a) => a.id !== assignmentId));

  // @ts-expect-error kj kj
  const product = products.find((p) => p.id === assignment.productId);
  // @ts-expect-error kj kj
  const warehouse = warehouses.find((w) => w.id === assignment.warehouseId);
      if (product && warehouse) {
  // @ts-expect-error kj kj
  logStockMovement('Delete', `Deleted ${assignment.quantity} of ${product.name} from ${warehouse.name}`);
      }

      setAssignmentSummary({
  // @ts-expect-error kj kj
  assigned: [],
  // @ts-expect-error kj kj
  remaining: [{ productId: assignment.productId, quantity: assignment.quantity }],
      });
    }
  };

  const handleGenerateLabel = () => {
    setIsLabelDialogOpen(true);
  };

  const handleConfirmLabel = () => {
  // @ts-expect-error kj kj
    const warehouse = warehouses.find((w) => w.id === labelWarehouse);
    if (!warehouse) {
      alert('Warehouse not found.');
      return;
    }
  
  // @ts-expect-error kj kj
    const assignedProducts = assignmentSummary?.assigned.map((item) => {
  // @ts-expect-error kj kj
      const product = products.find((p) => p.id === item.productId);
      return {
        ...item,
        product,
      };
    });
  
    const labelContent = `
      <div id="label-content" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 10px; width: 300px; background-color: #f9f9f9;">
        <h2 style="text-align: center; color: #333;"></h2>
        <p style="font-size: 14px; color: #555;"><strong>Warehouse:</strong> ${
  // @ts-expect-error kj kj
          warehouse.name}</p>
        <p style="font-size: 14px; color: #555;"><strong>Address:</strong> ${labelAddress}</p>
        <h3 style="color: #333;">Products:</h3>
        <ul style="list-style: none; padding: 0;">
          ${
  // @ts-expect-error kj kj
  assignedProducts?.map((a) => `
            <li style="margin-bottom: 10px; padding: 10px; border-bottom: 1px solid #ddd;">
              <strong style="color: #333;">ID:</strong> ${a.product?.id || 'N/A'}<br>
              <strong style="color: #333;">SKU:</strong> ${a.product?.id || 'N/A'}<br>
              <strong style="color: #333;">Barcode:</strong> <img src="${generateBarcode(a.product?.barcode || 'N/A')}" alt="Barcode"><br>
              <strong style="color: #333;">Name:</strong> ${a.product?.name || 'N/A'}<br>
              <strong style="color: #333;">Category:</strong> ${a.product?.category || 'Clothing'}<br>
              <strong style="color: #333;">Price:</strong> £${a.product?.price || 'N/A'}<br>
              <strong style="color: #333;">Quantity:</strong> ${a.quantity || 'N/A'}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  
    // Append the label content to the DOM
    const labelContainer = document.getElementById('generated-label');
    if (labelContainer) {
      labelContainer.innerHTML = labelContent;
    }
  
    alert('Label generated successfully!');
    setIsLabelGenerated(true); // Set label generated state to true
    setIsLabelDialogOpen(false);
  };

  const generateBarcode = (barcode:any) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcode, { format: 'CODE128' });
    return canvas.toDataURL('image/png');
  };

  const handleDownloadLabel = () => {
    const labelElement = document.getElementById('label-content');
    if (labelElement) {
      html2canvas(labelElement).then((canvas) => {
        const link = document.createElement('a');
        link.download = 'label.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  };

  const handlePrintLabel = () => {
    const labelElement = document.getElementById('label-content');
    if (labelElement) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Label</title>
              <style>
                body { font-family: Arial, sans-serif; }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>
              ${labelElement.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      } else {
        alert('Failed to open print window. Please allow pop-ups and try again.');
      }
    } else {
      alert('Label content not found. Please generate the label first.');
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
  // @ts-expect-error kj kj
    warehouse.name.toLowerCase().includes(search.toLowerCase()) ||
  // @ts-expect-error kj kj
    warehouse.location.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredWarehouses.length / ITEMS_PER_PAGE);
  const paginatedWarehouses = filteredWarehouses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status:any) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const handleEditWarehouse = async (data:any) => {
    if (!permissions.canEditWarehouse) {
      alert('You do not have permission to edit warehouses.');
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('warehouses')
        .update({
          name: data.name,
          location: data.location,
          coordinates: data.coordinates,
          capacity: data.capacity,
          manager: data.manager,
          contact: data.contact,
          status: data.status
        })
  // @ts-expect-error kj kj
        .eq('id', editingWarehouse.id);

      if (error) throw error;
      
      await fetchWarehouses(); // Refresh warehouses
      setEditingWarehouse(null);
      alert('Warehouse has been successfully updated.');
    } catch (error) {
      console.error('Error updating warehouse:', error);
      alert('Failed to update warehouse. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!permissions.canDeleteWarehouse) {
      alert('You do not have permission to delete warehouses.');
      return;
    }

    if (!deletingWarehouseId) return;

    try {
      setIsLoading(true);
      
      // First check if warehouse has any assignments
      const { data: assignments, error: checkError } = await supabase
        .from('warehouse_assignments')
        .select('id')
        .eq('warehouseId', deletingWarehouseId);

      if (checkError) throw checkError;

      if (assignments && assignments.length > 0) {
        alert('Cannot delete warehouse with assigned stocks. Please remove assignments first.');
        return;
      }

      // Delete the warehouse
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', deletingWarehouseId);

      if (error) throw error;
      
  // @ts-expect-error kj kj
      setWarehouses(warehouses.filter(w => w.id !== deletingWarehouseId));
      setDeletingWarehouseId(null);
      alert('Warehouse has been successfully deleted.');
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      alert('Failed to delete warehouse. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logStockMovement = (action: string, details: string) => {
  // @ts-expect-error kj kj
    setStockMovements((prev) => [
      ...prev,
      { id: `${Date.now()}`, action, details, timestamp: new Date() },
    ]);
  };

  const WarehouseSelect = () => (
    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select warehouse" />
      </SelectTrigger>
      <SelectContent>
        {warehouses.length === 0 ? (
          <SelectItem value="" disabled>
            Please add at least one warehouse first
          </SelectItem>
        ) : (
          warehouses.map((warehouse) => (
  // @ts-expect-error kj kj
            <SelectItem key={warehouse.id} value={warehouse.id}>
  {/* @ts-expect-error kj kj */}
  {warehouse.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );

  const StockMovementsTable = () => (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Recent Stock Movements</h3>
      {stockMovements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Please assign stocks to warehouses to see stock movements
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockMovements.map((movement) => (
  // @ts-expect-error kj kj
              <TableRow key={movement.id}>
                <TableCell>
   {/* @ts-expect-error kj kj */}
  {new Date(movement.timestamp).toLocaleString()}
                </TableCell>
  {/* @ts-expect-error kj kj */}
  <TableCell>{movement.warehouses?.name || 'Unknown Warehouse'}</TableCell>
  {/* @ts-expect-error kj kj */}
                <TableCell>{movement.products?.name || 'Unknown Product'}</TableCell>
  {/* @ts-expect-error kj kj */}
                <TableCell>{movement.quantity}</TableCell>
                <TableCell>
  {/* @ts-expect-error kj kj */}
                  <Badge variant={movement.movement_type === 'assignment' ? 'default' : 'secondary'}>
  {/* @ts-expect-error kj kj */}
                    {movement.movement_type}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Warehouse Management</h1>
        <div className="flex gap-2">
          {permissions.canCreateWarehouse && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Warehouse
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Warehouse</DialogTitle>
                </DialogHeader>
                <WarehouseForm onSubmit={handleAddWarehouse} isLoading={isLoading} />
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Assign Stocks to Warehouse</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl z-50">
              <DialogHeader>
                <DialogTitle>
                  {editingAssignmentId ? 'Edit Stock Assignment' : 'Assign Stocks to Warehouse'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <WarehouseSelect />

                <div className="space-y-2">
                  {products.map((product) => (
                    // @ts-expect-error kjj m,
                    <div key={product.id} className="flex items-center justify-between">
                      <div>
                     {/* @ts-expect-error kjj m, */}
                    <p className="font-medium">{product.name}</p>
                     {/* @ts-expect-error kjj m, */}
                        <p className="text-sm text-muted-foreground">Available: {product.quantity}</p>
                      </div>
                      <Input
                        type="number"
                        placeholder="Quantity"
                        //  @ts-expect-error kjj m
                        value={quantities[product.id] || 0}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                        //  @ts-expect-error kjj m
                            [product.id]: Math.max(0, parseInt(e.target.value, 10)),
                          })
                        }
                        className="w-24"
                        min={0}
                        //  @ts-expect-error kjj m
                        max={product.quantity}
                      />
                    </div>
                  ))}
                </div>

                <Button onClick={editingAssignmentId ? handleUpdateAssignment : handleAssignStock}>
                  {editingAssignmentId ? 'Update Stock' : 'Assign Stock'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {assignmentSummary && (
        <div className="p-4 bg-blue-100 text-blue-800 rounded-lg">
          <h3 className="font-bold">Assignment Summary:</h3>
          <ul>
                        {/* @ts-expect-error kjj m */}
            {assignmentSummary.assigned.map((item) => {
                        //  @ts-expect-error kjj m
              const product = products.find((p) => p.id === item.productId);
              return (
                <li key={item.productId}>
                         {/* @ts-expect-error kjj m */}
                        Assigned {item.quantity} of {product?.name} to {item.warehouseName}.
                </li>
              );
            })}
                        {/* @ts-expect-error kjj m */}
                        {assignmentSummary.remaining.map((item) => {
                        //  @ts-expect-error kjj m
              const product = products.find((p) => p.id === item.productId);
              return (
                <li key={item.productId}>
                        {/* @ts-expect-error kjj m */}
                        {item.quantity} of {product?.name} could not be assigned due to insufficient stock.
                </li>
              );
            })}
          </ul>
          <Button onClick={handleGenerateLabel} className="mt-2">Generate Label</Button>
        </div>
      )}

      <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Address and Select Warehouse for Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={setLabelWarehouse} value={labelWarehouse}>
              <SelectTrigger>
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                        //  @ts-expect-error kjj m
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                        {/* @ts-expect-error kjj m */}
                        {warehouse.name} - {warehouse.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Enter address"
              value={labelAddress}
              onChange={(e) => setLabelAddress(e.target.value)}
            />
            <Button onClick={handleConfirmLabel}>Generate Label</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div id="generated-label" className="mt-4"></div>
      {isLabelGenerated && ( // Conditionally render the "Print Label" button
        <div className="flex gap-4 mt-4">
          
          <Button onClick={handlePrintLabel}>Print Label</Button>
        </div>
      )}

      <StockMovementsTable />

      {assignedStocks.length > 0 && (
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Assigned Stocks</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(
                assignedStocks.reduce((acc, assignment) => {
                        //  @ts-expect-error kjj m
                  const warehouse = warehouses.find((w) => w.id === assignment.warehouseId);
                  if (warehouse) {
                        //  @ts-expect-error kjj m
                    if (!acc[warehouse.name]) {
                        //  @ts-expect-error kjj m
                      acc[warehouse.name] = [];
                    }
                        //  @ts-expect-error kjj m
                    acc[warehouse.name].push(assignment);
                  }
                  return acc;
                }, {} as { [warehouseName: string]: any[] })
              ).map(([warehouseName, assignments]) => (
                <React.Fragment key={warehouseName}>
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold">
                      {warehouseName}
                    </TableCell>
                  </TableRow>
                  {assignments.map((assignment) => {
                        //  @ts-expect-error kjj m
                    const product = products.find((p) => p.id === assignment.productId);
                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>{warehouseName}</TableCell>
                        {/* @ts-expect-error kjj m */}
                        <TableCell>{product?.name}</TableCell>
                        <TableCell>{assignment.quantity}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditAssignment(assignment.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="h-[400px] rounded-lg border bg-card relative z-10">
        <WarehouseMap locations={paginatedWarehouses.map(w => ({
          // @ts-expect-error jkkj
          name: w.name,
          // @ts-expect-error jkkj
          coordinates: w.coordinates,
          // @ts-expect-error jkkj
          products: w.products,
          // @ts-expect-error jkkj
          revenue: w.revenue,
          // @ts-expect-error jkkj
          utilization: w.utilization
        }))} />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search warehouses..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredWarehouses.length)} of{' '}
          {filteredWarehouses.length} warehouses
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Utilization</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Status</TableHead>
                            <TableHead>Manager</TableHead>
              <TableHead>Stocks Assigned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedWarehouses.map((warehouse) => (
                      //  @ts-expect-error kjnj n
              <TableRow key={warehouse.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      {/* @ts-expect-error kjnj n */}
                      <div className="font-medium">{warehouse.name}</div>
                      {/* @ts-expect-error kjnj n */}
                      <div className="text-sm text-muted-foreground">ID: {warehouse.id}</div>
                    </div>
                  </div>
                </TableCell>
                      {/* @ts-expect-error kjnj n */}
                <TableCell>{warehouse.location}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                      // @ts-expect-error kjnj n */}
                        style={{ width: `${warehouse.utilization}%` }}
                      />
                    </div>
                      {/* @ts-expect-error kjnj n */}
                    <span className="text-sm">{warehouse.utilization}%</span>
                  </div>
                </TableCell>
                      {/* @ts-expect-error kjnj n */}
                <TableCell>£{warehouse.revenue.toLocaleString()}</TableCell>
                      {/* @ts-expect-error kjnj n */}
                <TableCell>{getStatusBadge(warehouse.status)}</TableCell>
                      {/* @ts-expect-error kjnj n */}
                <TableCell>{warehouse.manager}</TableCell>
                <TableCell>
                      {/* @ts-expect-error kjnj n */}
                  {warehouse.assignedStocks?.length > 0 ? (
                    <ul>
                      {/* @ts-expect-error kjnj n */}

                      {warehouse.assignedStocks.map((stock) => (
                        <li key={stock.id}>
                          {stock.quantity} of {stock.products?.name || 'Unknown Product'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'No stock assigned yet'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {permissions.canEditWarehouse && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingWarehouse(warehouse)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Warehouse</DialogTitle>
                          </DialogHeader>
                          <WarehouseForm
                            warehouse={editingWarehouse}
                            onSubmit={handleEditWarehouse}
                            isLoading={isLoading}
                          />
                        </DialogContent>
                      </Dialog>
                    )}

                    {permissions.canDeleteWarehouse && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            // @ts-expect-error kj kj
                            onClick={() => setDeletingWarehouseId(warehouse.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this warehouse? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeletingWarehouseId(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteWarehouse}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
