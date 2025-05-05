'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth/SupabaseClient';
import dynamic from 'next/dynamic';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
// import WarehouseForm from '@/components/warehouses/warehouse-form';

import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const ITEMS_PER_PAGE = 10;

const WarehouseForm = dynamic(() => import('@/components/warehouses/warehouse-form').then((mod) => mod.default), { ssr: false });

interface Warehouse {
  id: string;
  client_id: string;
  name: string;
  location: string;
  coordinates: number[];
  capacity: number;
  utilization: number;
  revenue: number;
  products: number;
  manager: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface WarehouseInventory {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  min_quantity: number;
  max_quantity: number;
  location_code: string;
  status: string;
  last_updated: string;
}

interface InventoryMovement {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  movement_type: 'in' | 'out' | 'transfer';
  reference_number: string;
  notes: string;
  performed_by: string;
  timestamp: string;
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  sku: string;
  category: string;
  condition: string;
  price: number;
  status: string;
  client_id: string;
}

interface LocationSuggestion {
  display_name: string;
  lat: number;
  lon: number;
}

export default function WarehousesPageContent() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [quantities, setQuantities] = useState({});
  const [warehouseInventory, setWarehouseInventory] = useState<WarehouseInventory[]>([]);
  const [stockMovements, setStockMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
    checkAuthAndFetchData();
    }
  }, []);

  const checkAuthAndFetchData = async () => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      toast.error('Please sign in to view warehouses');
      return;
    }

    try {
      const userData = JSON.parse(currentUser);
      await Promise.all([
        fetchWarehouses(userData.id),
        fetchProducts(userData.id),
        fetchInventory(),
        fetchMovements()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const fetchWarehouses = async (clientId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error('Failed to fetch warehouses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWarehouse = async (data:any) => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      toast.error('Please sign in to add a warehouse');
      return;
    }

    try {
      setIsLoading(true);
      const userData = JSON.parse(currentUser);

      // Validate location before saving
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.location)}&limit=1`
      );
      const locationData = await response.json();

      if (!locationData || locationData.length === 0) {
        toast.error('Please enter a valid location');
        return;
      }

      const location = locationData[0];
      const coordinates = [parseFloat(location.lat), parseFloat(location.lon)];

      const newWarehouse = {
        name: data.name,
        location: location.display_name, // Use the standardized address
        coordinates: coordinates,
        capacity: parseInt(data.capacity) || 10000,
        utilization: 0,
        revenue: 0,
        products: 0,
        manager: data.manager,
        status: 'active',
        client_id: userData.id
      };

      const { data: createdWarehouse, error: insertError } = await supabase
        .from('warehouses')
        .insert([newWarehouse])
        .select('*')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      if (!createdWarehouse) {
        throw new Error('No warehouse data returned');
      }
      
      setWarehouses(prev => [createdWarehouse, ...prev]);
      setShowAddDialog(false);
      toast.success('Warehouse added successfully');
    } catch (error) {
      console.error('Error adding warehouse:', error);
      // @ts-expect-error j kj
      toast.error(`Failed to add warehouse: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWarehouse = async (data:any) => {
    if (!editingWarehouse?.id) return;

    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      toast.error('Please sign in to edit warehouses');
      return;
    }

    try {
      setIsLoading(true);
      const userData = JSON.parse(currentUser);

      // Validate location before updating
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.location)}&limit=1`
      );
      const locationData = await response.json();

      if (!locationData || locationData.length === 0) {
        toast.error('Please enter a valid location');
        return;
      }

      const location = locationData[0];
      const coordinates = [parseFloat(location.lat), parseFloat(location.lon)];

      const { error } = await supabase
        .from('warehouses')
        .update({ 
          name: data.name,
          location: location.display_name, // Use the standardized address
          coordinates: coordinates,
          capacity: data.capacity,
          manager: data.manager,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingWarehouse.id)
        .eq('client_id', userData.id);

      if (error) throw error;

      setWarehouses(prev => 
        prev.map(w => w.id === editingWarehouse.id ? {
          ...w,
          ...data,
          location: location.display_name,
          coordinates: coordinates
        } : w)
      );
      setEditingWarehouse(null);
      toast.success('Warehouse updated successfully');
    } catch (error) {
      console.error('Error updating warehouse:', error);
      toast.error('Failed to update warehouse');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!deletingWarehouseId) return;

    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      toast.error('Please sign in to delete warehouses');
      return;
    }

    try {
      setIsLoading(true);
      const userData = JSON.parse(currentUser);
      
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', deletingWarehouseId)
        .eq('client_id', userData.id);

      if (error) throw error;
      
      setWarehouses(prev => prev.filter(w => w.id !== deletingWarehouseId));
      setDeletingWarehouseId(null);
      toast.success('Warehouse deleted successfully');
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      toast.error('Failed to delete warehouse');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignStock = async () => {
    if (!selectedWarehouse) {
      toast.error('Please select a warehouse.');
      return;
    }

    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      toast.error('Please sign in to assign stocks.');
      return;
    }

    try {
      const userData = JSON.parse(currentUser);
      setIsLoading(true);

      const stockAssignments = Object.entries(quantities)
      // @ts-expect-error kj j
      .filter(([_, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({
        product_id: productId,
        // @ts-expect-error kj j
          quantity: parseInt(quantity.toString()),
        }));

      if (stockAssignments.length === 0) {
        toast.error('Please specify quantities for at least one product.');
        return;
      }

      // Process each assignment
      for (const assignment of stockAssignments) {
        console.log('Processing assignment:', assignment); // Debug log

        // First, verify the product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('name, quantity')
          .eq('id', assignment.product_id)
          .single();

        if (productError) {
          console.error('Product check error:', productError);
          throw new Error(`Failed to check product: ${productError.message}`);
        }

        // Create the movement record directly first for debugging
        const { data: movementData, error: movementError } = await supabase
          .from('inventory_movements')
          .insert([{
            warehouse_id: selectedWarehouse,
            product_id: assignment.product_id,
            quantity: assignment.quantity,
            movement_type: 'in',
            reference_number: `ASN-${Date.now()}`,
            notes: `Stock assignment of ${assignment.quantity} units`,
            performed_by: userData.email,
            client_id: userData.id,
            timestamp: new Date().toISOString()
          }])
          .select();

        console.log('Created movement:', movementData, 'Error:', movementError); // Debug log

        if (movementError) {
          console.error('Movement creation error:', movementError);
          throw new Error(`Failed to create movement: ${movementError.message}`);
        }

        // Then call the stored procedure
        const { error: assignError } = await supabase.rpc('assign_warehouse_stock', {
          p_warehouse_id: selectedWarehouse,
          p_product_id: assignment.product_id,
          p_quantity: assignment.quantity,
          p_client_id: userData.id,
          p_reference_number: `ASN-${Date.now()}`,
          p_notes: `Stock assignment of ${assignment.quantity} units`,
          p_performed_by: userData.email
        });

        if (assignError) {
          console.error('Assignment error:', assignError);
          throw new Error(`Failed to assign stock: ${assignError.message}`);
        }
      }

      // Refresh data immediately after assignments
      await fetchMovements();
      await Promise.all([
        fetchProducts(userData.id),
        fetchWarehouses(userData.id),
        fetchInventory()
      ]);

      setQuantities({});
      setSelectedWarehouse('');
      setShowAssignDialog(false);
      toast.success('Stocks assigned successfully!');
    } catch (error) {
      console.error('Error assigning stocks:', error);
      // @ts-expect-error kj j
      toast.error(error.message || 'Failed to assign stocks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_inventory')
        .select(`
          *,
          warehouses (name),
          products (name, sku)
        `);

      if (error) throw error;
      setWarehouseInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to fetch inventory');
    }
  };

  const fetchMovements = async () => {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        toast.error('Please sign in to view stock movements');
        return;
      }

      const userData = JSON.parse(currentUser);
      
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          warehouses:warehouse_id (
            name
          ),
          products:product_id (
            name,
            sku
          )
        `)
        .eq('client_id', userData.id)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching movements:', error);
        throw error;
      }

      console.log('Fetched movements:', data);
      setStockMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('Failed to fetch movement history');
    }
  };

  const fetchProducts = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          quantity,
          sku,
          category,
          condition,
          price,
          status
        `)
        .eq('client_id', clientId)
        .order('name');
      
      if (error) throw error;
      // @ts-expect-error kj j
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  // Filter and pagination logic
  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(search.toLowerCase()) ||
    warehouse.location.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredWarehouses.length / ITEMS_PER_PAGE);
  const paginatedWarehouses = filteredWarehouses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Add location validation function
  const validateAndSuggestLocations = async (location: string) => {
    if (!location || location.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      setIsValidatingLocation(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=5`
      );
      const data = await response.json();
      setLocationSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      toast.error('Failed to fetch location suggestions');
    } finally {
      setIsValidatingLocation(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Warehouse Management</h1>
        <div className="flex gap-2">
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Warehouse
        </Button>
          <Button onClick={() => setShowAssignDialog(true)} variant="outline">
            Assign Products
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search warehouses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
          </div>
        </div>
      </div>

      {/* Warehouses Table */}
      {warehouses.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold">No Warehouses Found</h3>
          <p className="text-sm text-gray-500 mt-2">Add your first warehouse to get started.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedWarehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell>{warehouse.name}</TableCell>
                  <TableCell>{warehouse.location}</TableCell>
                  <TableCell>{warehouse.manager}</TableCell>
                  <TableCell>{warehouse.capacity.toLocaleString()} units</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 rounded-full h-2"
                          style={{ width: `${warehouse.utilization}%` }}
                        />
                      </div>
                      <span className="text-sm">{warehouse.utilization}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={warehouse.status === 'active' ? 'success' : 'secondary'}>
                      {warehouse.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingWarehouse(warehouse)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingWarehouseId(warehouse.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {warehouses.length > 0 && (
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
          <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
          </span>
        <Button
          variant="outline"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || !!editingWarehouse} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingWarehouse(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
            </DialogTitle>
          </DialogHeader>
          <WarehouseForm
            warehouse={editingWarehouse}
            onSubmit={editingWarehouse ? handleEditWarehouse : handleAddWarehouse}
            isLoading={isLoading}
            // @ts-expect-error kj jj
            locationSuggestions={locationSuggestions}
            isValidatingLocation={isValidatingLocation}
            onLocationChange={validateAndSuggestLocations}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingWarehouseId} onOpenChange={() => setDeletingWarehouseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this warehouse? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWarehouse}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Products Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Products to Warehouse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} - {warehouse.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    {product.quantity <= 0 ? (
                      <p className="text-sm text-red-500 font-medium">No quantity available</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Available: {product.quantity}</p>
                    )}
                  </div>
                  <Input
                    type="number"
                    placeholder="Quantity"
      // @ts-expect-error kj j
                    value={quantities[product.id] || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= product.quantity) {
                        setQuantities(prev => ({
                          ...prev,
                          [product.id]: value
                        }));
                      }
                    }}
                    className="w-24"
                    min={0}
                    max={product.quantity}
                    disabled={product.quantity <= 0}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignStock}
                disabled={
                  !selectedWarehouse || 
                  Object.keys(quantities).length === 0 ||
      // @ts-expect-error kj j
                  !Object.values(quantities).some(q => q > 0)
                }
              >
                Assign Products
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Movement History */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Stock Movement History</h2>
        {stockMovements.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            <p>No stock movements found</p>
            <p className="text-sm mt-2">Movements will appear here after assigning products to warehouses</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    {new Date(movement.timestamp).toLocaleString()}
                  </TableCell>
                  {/* @ts-expect-error */}
                  <TableCell>{movement.warehouses?.name || 'N/A'}</TableCell>
                  {/* @ts-expect-error */}
                  <TableCell>{movement.products?.name || 'N/A'}</TableCell>
                  {/* @ts-expect-error */}
                  <TableCell>{movement.products?.sku || 'N/A'}</TableCell>
                  <TableCell>{movement.quantity}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        movement.movement_type === 'in' ? 'success' : 
                        movement.movement_type === 'out' ? 'destructive' : 
                        'secondary'
                      }
                    >
                      {movement.movement_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{movement.reference_number}</TableCell>
                  <TableCell>{movement.performed_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Available Products */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Available Products</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Available Quantity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.condition}</TableCell>
                <TableCell>
                  {product.quantity <= 0 ? (
                    <span className="text-red-500 font-medium">No quantity available</span>
                  ) : (
                    product.quantity
                  )}
                </TableCell>
                <TableCell>£{product.price}</TableCell>
                <TableCell>
                  <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAssignDialog(true);
                      setSelectedWarehouse('');
                      setQuantities({ [product.id]: 0 });
                    }}
                    disabled={product.quantity <= 0}
                  >
                    {product.quantity <= 0 ? 'Out of Stock' : 'Assign to Warehouse'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 