'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';
import { Plus, Upload, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/auth/SupabaseClient';

// Import your UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Constants
const CATEGORIES = [
  'Container load',
  'Truck loads',
  'Pallets',
  'Boxes',
  'Returns',
  'Waste removal',
  'Asset removal'
];
const CONDITIONS = ['New', 'Like New', 'Used', 'Refurbished', 'For Parts'];

// Types
interface Product {
  id: number;
  client_id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category: string;
  condition: string;
  height: number | null;
  weight: number | null;
  dimensions: string | null;
  length: number | null;
  width: number | null;
  status: 'pending' | 'saved';
}

interface UploadedProduct extends Omit<Product, 'id'> {
  id?: number;
}

interface ShippingLabel {
  packageId: string;
  products: Array<{
    name: string;
    quantity: number;
    dimensions: string | null;
    weight: number | null;
  }>;
  pickup: {
    location: string;
    time: string;
  };
  delivery: {
    address: string;
    notes: string;
  };
  courier: {
    name: string;
    vehicle: string;
    phone: string;
  };
  priority: string;
  totalWeight: number;
  status: string;
  createdAt: string;
}

// Main component
export default function InventoriesPage() {
  console.log('InventoriesPage mounted');
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastDeliveryDetails, setLastDeliveryDetails] = useState<ShippingLabel | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [deliveryType, setDeliveryType] = useState<'client' | 'warehouse'>('client');
  const [deliveryFormData, setDeliveryFormData] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    pickup_time: '',
    client_address: '',
    notes: '',
    priority: 'medium',
  });
  const [couriers, setCouriers] = useState<{ id: string; name: string; vehicle_type: string; phone: string; client_id: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; location: string; client_id: string }[]>([]);
  const [editingWarehouseItem, setEditingWarehouseItem] = useState<any | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [truckArrivals, setTruckArrivals] = useState<any[]>([]);
  const [truckItems, setTruckItems] = useState<any[]>([]);
  const [editingTruckItem, setEditingTruckItem] = useState<any | null>(null);
  const [showDeleteTruckDialog, setShowDeleteTruckDialog] = useState(false);
  const [truckItemToDelete, setTruckItemToDelete] = useState<any | null>(null);
  const [labelItem, setLabelItem] = useState<any | null>(null);

  // Move this function to top-level scope
  const fetchTruckItemsWithArrival = async () => {
    if (!currentUser) {
      console.log('No current user, skipping fetch');
      return;
    }
    
    console.log('Fetching truck items for client:', currentUser.id);
    const { data, error } = await supabase
      .from('warehouse_items')
      .select(`
        *,
        truck_arrival:truck_arrival_id (
          vehicle_registration,
          customer_name,
          driver_name,
          vehicle_size,
          load_type,
          arrival_time,
          warehouse_id
        )
      `)
      .eq('client_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching truck_items with arrival:', error);
    } else {
      console.log('Fetched truck items:', data);
      // Transform the data to match our table structure
      const transformedData = data.map(item => ({
        ...item,
        truck_arrival: item.truck_arrival
      }));
      setTruckItems(transformedData);
    }
  };

  // Fetch current user and their products
  useEffect(() => {
    const fetchUserAndProducts = async () => {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) {
          router.push('/auth/login');
          return;
        }

        const user = JSON.parse(userStr);
        setCurrentUser(user);

        // Fetch products for current user from Supabase
        const { data: userProducts, error } = await supabase
          .from('products')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setProducts(userProducts.map(product => ({
          ...product,
          status: 'saved'
        })));
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProducts();
  }, [router]);

  // Fetch warehouse items
  const fetchWarehouseItems = async () => {
    if (!currentUser) {
      console.log('No current user, skipping fetch');
      return;
    }
    
    console.log('Fetching warehouse items for client:', currentUser.id);
    const { data, error } = await supabase
      .from('warehouse_items')
      .select(`
        *,
        truck_arrival:truck_arrival_id (
          vehicle_registration,
          customer_name,
          driver_name,
          vehicle_size,
          load_type,
          arrival_time,
          warehouse_id
        ),
        putaway:putaway_id (
          aisle,
          bay,
          level,
          position,
          label
        ),
        quality_check:quality_check_id (
          status,
          damage_image_url
        )
      `)
      .eq('client_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching warehouse items:', error);
    } else {
      console.log('Fetched warehouse items:', data);
      // Transform the data to match our table structure
      const transformedData = data.flatMap(item => ({
        ...item,
        truck_arrival: item.truck_arrival
      }));
      setWarehouseItems(transformedData);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTruckItemsWithArrival();
      fetchWarehouseItems();
    }
  }, [currentUser]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      toast.error('Please sign in first');
      return;
    }

    const userData = JSON.parse(currentUser);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON with raw headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, header: 1 });
      
      if (jsonData.length < 2) {
        toast.error('Excel file must have at least a header row and one data row');
        return;
      }

      // Get headers from first row and normalize them
      const headers = (jsonData[0] as string[]).map(header => 
        header ? header.toString().toLowerCase().trim() : ''
      );
      console.log('Found headers:', headers);

      // Find the name column index (using Description)
      const nameColumnIndex = headers.findIndex(header => 
        header.includes('name') || 
        header.includes('product') || 
        header.includes('item') ||
        header.includes('description') ||  // Added for your Excel format
        header === 'nama'
      );

      if (nameColumnIndex === -1) {
        toast.error('Could not find a product name/description column. Your headers are: ' + headers.join(', '));
        return;
      }

      // Find price column indices (both Cost Price and Sale Price)
      const salePriceIndex = headers.findIndex(header => 
        header.includes('sale price') ||
        header.includes('selling price')
      );
      
      const costPriceIndex = headers.findIndex(header => 
        header.includes('cost price') ||
        header.includes('buying price')
      );

      const priceColumnIndex = salePriceIndex !== -1 ? salePriceIndex : costPriceIndex;

      if (priceColumnIndex === -1) {
        toast.error('Could not find a price column (Sale Price or Cost Price). Your headers are: ' + headers.join(', '));
        return;
      }

      const qtyColumnIndex = headers.findIndex(header => 
        header.includes('quantity') || 
        header.includes('qty') ||
        header.includes('jumlah') ||
        header.includes('amount')
      );

      // Find size column index
      const sizeColumnIndex = headers.findIndex(header => header.includes('size'));

      // Process data rows
      const productsToAdd = jsonData.slice(1).map((row: any) => {
        const productName = row[nameColumnIndex]?.toString() || '';
        const rawPrice = row[priceColumnIndex];
        // Handle price that might be a string with currency symbol
        const price = typeof rawPrice === 'string' 
          ? parseFloat(rawPrice.replace(/[^0-9.-]+/g, ''))
          : parseFloat(rawPrice) || 0;
          
        const quantity = qtyColumnIndex !== -1 ? parseInt(row[qtyColumnIndex] || 0) : 0;
        const size = sizeColumnIndex !== -1 ? row[sizeColumnIndex]?.toString() : '';

        console.log('Processing row:', {
          name: productName,
          rawPrice,
          processedPrice: price,
          quantity: quantity,
          size: size
        });

        if (!productName || isNaN(price)) {
          console.log('Skipping invalid row:', { productName, rawPrice, price });
          return null;
        }

        return {
          id: Date.now(),
          client_id: userData.id,
          name: productName + (size ? ` (${size})` : ''),
          sku: generateSKU(),
          price: price,
          quantity: quantity,
          category: '',
          condition: 'New',
          height: null,
          weight: null,
          dimensions: null,
          status: 'pending' as const
        } as Product;
      }).filter(product => product !== null);

      console.log('Processed products:', productsToAdd);

      if (productsToAdd.length === 0) {
        toast.error('No valid products found in the data rows. Please check your Excel file format.');
        return;
      }

      setProducts(prev => [...productsToAdd, ...prev]);
      toast.success(`${productsToAdd.length} products imported successfully. Please review and save them.`);
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error('Failed to import products. Please check your Excel file format.');
    }
  };

  const generateSKU = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `SKU-${timestamp}-${random}`;
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'client_id' | 'sku'>) => {
    if (!currentUser) {
      toast.error('Please log in first');
      return;
    }

    try {
      const newProduct = {
        client_id: currentUser.id,
        name: productData.name,
        sku: generateSKU(),
        price: parseFloat(productData.price.toString()),
        quantity: parseInt(productData.quantity.toString()),
        category: productData.category,
        condition: productData.condition,
        height: productData.height || null,
        weight: productData.weight || null,
        dimensions: productData.dimensions || null,
        status: 'saved'
      };

      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [{
        ...data,
        status: 'saved'
      }, ...prev]);
      
      setIsAddProductOpen(false);
      toast.success('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const handleCategoryChange = (value: string, index: number) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      category: value
    };
    setProducts(updatedProducts);
  };

  const handleConditionChange = (value: string, index: number) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      condition: value
    };
    setProducts(updatedProducts);
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) {
        toast.error('Please log in first');
        return;
      }
      const user = JSON.parse(userStr);

      if (!product.category || !product.condition) {
        toast.error('Please select both category and condition');
        return;
      }

      if (product.weight && (isNaN(product.weight) || product.weight < 0)) {
        toast.error('Please enter a valid weight');
        return;
      }

      // Combine dimensions if all measurements are present
      const dimensions = (product.length && product.width && product.height)
        ? `${product.length}x${product.width}x${product.height} cm`
        : null;

      const productData = {
        client_id: user.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: product.quantity,
        category: product.category,
        condition: product.condition,
        height: product.height,
        weight: product.weight,
        dimensions: dimensions,
        status: 'saved' as const
      };

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.sku === product.sku ? { ...data, status: 'saved' } : p
      ));

      toast.success('Product saved successfully');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleEditProduct = async (productData: Product) => {
    try {
      // Combine dimensions if all measurements are present
      const dimensions = (productData.length && productData.width && productData.height)
        ? `${productData.length}x${productData.width}x${productData.height} cm`
        : null;

      const { error } = await supabase
        .from('products')
        .update({
          name: productData.name,
          price: productData.price,
          quantity: productData.quantity,
          category: productData.category,
          condition: productData.condition,
          height: productData.height || null,
          weight: productData.weight || null,
          dimensions: dimensions
        })
        .eq('id', productData.id);

      if (error) throw error;

      setProducts(prev => 
        prev.map(p => p.id === productData.id ? productData : p)
      );
      setEditingProduct(null);
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleAssignDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get the selected courier and warehouse
      // @ts-expect-error kl
      const selectedCourierData = couriers.find(c => c.id === selectedCourier);
      const selectedWarehouse = warehouses.find(w => w.id === deliveryFormData.source_warehouse_id);

      if (!selectedCourierData || !selectedWarehouse) {
        throw new Error('Selected courier or warehouse not found');
      }

      // Verify courier and warehouse belong to the same client
      if (selectedCourierData.client_id !== selectedWarehouse.client_id) {
        throw new Error('Courier and warehouse must belong to the same client');
      }

      // Generate a unique package ID
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const packageId = `PKG-${timestamp}-${random}`;

      // Calculate total weight and format dimensions
      const productsWithDetails = selectedProducts.map(product => {
      // @ts-expect-error kl
        const productDetails = warehouseProducts.find(wp => wp.id === product.product_id);
        return {
          name: product.name,
          quantity: product.quantity,
          dimensions: productDetails?.dimensions || null,
          weight: productDetails?.weight || null
        };
      });

      const totalWeight = productsWithDetails.reduce((sum, product) => 
        sum + (product.weight || 0) * product.quantity, 0);

      // Generate shipping label for client deliveries
      let shippingLabel = null;
      if (deliveryType === 'client') {
        shippingLabel = {
          packageId,
          products: productsWithDetails,
          pickup: {
            location: selectedWarehouse.location,
            time: deliveryFormData.pickup_time
          },
          delivery: {
            address: deliveryFormData.client_address,
            notes: deliveryFormData.notes || 'No special instructions'
          },
          courier: {
            name: selectedCourierData.name,
            vehicle: selectedCourierData.vehicle_type,
            phone: selectedCourierData.phone
          },
          priority: deliveryFormData.priority,
          totalWeight,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
      }

      // Create delivery payload with products and shipping label
      const deliveryPayload = {
      // @ts-expect-error kl
        courier_id: selectedCourier,
        package_id: packageId,
        priority: deliveryFormData.priority,
        status: 'pending',
        client_id: selectedCourierData.client_id,
        notes: deliveryFormData.notes || '',
        delivery_type: deliveryType,
        products: selectedProducts.map(product => ({
          name: product.name,
          quantity: product.quantity
        })),
        shipping_label: shippingLabel,
        total_weight: totalWeight
      };

      // Create the delivery record
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('deliveries')
        .insert([deliveryPayload])
        .select(`
          *,
          courier:courier_id (
            name,
            vehicle_type
          )
        `)
        .single();

      if (deliveryError) {
        console.error('Delivery Creation Error:', deliveryError);
        throw new Error(`Failed to create delivery: ${deliveryError.message}`);
      }

      // Prepare stops data
      const stops = deliveryType === 'warehouse' 
        ? [
            {
              delivery_id: deliveryData.id,
              warehouse_id: deliveryFormData.source_warehouse_id,
              address: selectedWarehouse.location,
              stop_type: 'pickup',
              sequence: 1,
              status: 'pending',
              estimated_time: deliveryFormData.pickup_time
            },
            {
              delivery_id: deliveryData.id,
              warehouse_id: deliveryFormData.destination_warehouse_id,
              address: warehouses.find(w => w.id === deliveryFormData.destination_warehouse_id)?.location || '',
              stop_type: 'delivery',
              sequence: 2,
              status: 'pending',
              estimated_time: deliveryFormData.pickup_time
            }
          ]
        : [
            {
              delivery_id: deliveryData.id,
              warehouse_id: deliveryFormData.source_warehouse_id,
              address: selectedWarehouse.location,
              stop_type: 'pickup',
              sequence: 1,
              status: 'pending',
              estimated_time: deliveryFormData.pickup_time
            },
            {
              delivery_id: deliveryData.id,
              warehouse_id: null,
              address: deliveryFormData.client_address,
              stop_type: 'delivery',
              sequence: 2,
              status: 'pending',
              estimated_time: deliveryFormData.pickup_time
            }
          ];

      // Create the delivery stops
      const { data: stopsData, error: stopsError } = await supabase
        .from('delivery_stops')
        .insert(stops)
        .select();

      if (stopsError) {
        console.error('Delivery Stops Creation Error:', stopsError);
        await supabase
          .from('deliveries')
          .delete()
          .eq('id', deliveryData.id);
        throw new Error(`Failed to create delivery stops: ${stopsError.message}`);
      }

      // Update the local state with the new delivery
      const newDelivery = {
        ...deliveryData,
        delivery_stops: stops,
        shipping_label: shippingLabel
      };
      // @ts-expect-error kh
      setDeliveryFormData(prevDeliveries => [newDelivery, ...prevDeliveries]);
      setLastDeliveryDetails(deliveryData);
      setShowSuccessDialog(true);
      // setShowAssignDeliveryDialog(false);
      // resetDeliveryForm();

    } catch (error: any) {
      console.error('Error in handleAssignDelivery:', error);
      toast.error(error.message || 'Failed to assign delivery');
    } finally {
      setLoading(false);
    }
  };

  // Edit warehouse item
  const handleEditWarehouseItem = async (updates: any) => {
    if (!editingWarehouseItem) return;
    const { error } = await supabase
      .from('warehouse_items')
      .update(updates)
      .eq('id', editingWarehouseItem.id);
    if (error) {
      toast.error('Failed to update warehouse item');
      return;
    }
    setEditingWarehouseItem(null);
    await fetchWarehouseItems();
    toast.success('Warehouse item updated');
  };

  // Delete warehouse item
  const handleDeleteWarehouseItem = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase
      .from('warehouse_items')
      .delete()
      .eq('id', itemToDelete.id);
    if (error) {
      toast.error('Failed to delete warehouse item');
      return;
    }
    setShowDeleteDialog(false);
    setItemToDelete(null);
    await fetchWarehouseItems();
    toast.success('Warehouse item deleted');
  };

  // Edit truck item
  const handleEditTruckItem = async (updates: any) => {
    if (!editingTruckItem) return;
    const { error } = await supabase
      .from('truck_items')
      .update(updates)
      .eq('id', editingTruckItem.id);
    if (error) {
      toast.error('Failed to update item');
      return;
    }
    setEditingTruckItem(null);
    await fetchTruckItemsWithArrival();
    toast.success('Item updated');
  };

  // Delete truck item
  const handleDeleteTruckItem = async () => {
    if (!truckItemToDelete) return;
    const { error } = await supabase
      .from('truck_items')
      .delete()
      .eq('id', truckItemToDelete.id);
    if (error) {
      toast.error('Failed to delete item');
      return;
    }
    setShowDeleteTruckDialog(false);
    setTruckItemToDelete(null);
    await fetchTruckItemsWithArrival();
    toast.success('Item deleted');
  };

  // Combined Table: Truck Arrival, Truck Items, Warehouse Items
  const combinedRows = [];
  // Add truck_arrival rows
  for (const arrival of truckArrivals) {
    combinedRows.push({
      type: 'truck_arrival',
      ...arrival
    });
  }
  // Add truck_items rows
  for (const tItem of truckItems) {
    combinedRows.push({
      type: 'truck_item',
      ...tItem
    });
  }
  // Add warehouse_items rows
  for (const wItem of warehouseItems) {
    combinedRows.push({
      type: 'warehouse_item',
      ...wItem
    });
  }

  // Download barcode image utility
  const downloadBarcode = (barcode: string, filename: string) => {
    const url = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcode)}&code=Code128&translate-esc=true`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to get company name (customize as needed)
  const getCompanyName = (item: any) => {
    // You can replace this with your actual company logic
    return item.truck_arrival?.customer_name || 'Warehouse Client';
  };

  // Optionally, you can set your logo URL here
  const companyLogoUrl = '';

  // Dashboard card style
  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    padding: 24,
    marginBottom: 32,
    border: '1px solid #f0f0f0',
  };
  const sectionHeaderStyle = {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 18,
    color: '#222',
    letterSpacing: 0.5,
  };
  const tableHeaderStyle = {
    background: '#f7f8fa',
    color: '#222',
    fontWeight: 600,
    fontSize: 15,
    borderBottom: '2px solid #e5e7eb',
  };
  const tableRowStyle = {
    background: '#fff',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.2s',
  };
  const tableRowHoverStyle = {
    background: '#f5f7fa',
  };
  const pageBgStyle = {
    background: '#f7f8fa',
    minHeight: '100vh',
    padding: '32px 0',
  };
  const pageTitleStyle = {
    fontSize: 32,
    fontWeight: 800,
    marginBottom: 32,
    color: '#1a1a1a',
    letterSpacing: 0.5,
  };

  // Table cell and header style helpers
  const cellStyle = {
    padding: '10px 12px',
    fontSize: 15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 120,
    border: 'none',
  };
  const headerCellStyle = {
    ...cellStyle,
    fontWeight: 700,
    background: '#f7f8fa',
    color: '#222',
    borderBottom: '2px solid #e5e7eb',
    fontSize: 15,
  };
  const actionCellStyle = {
    ...cellStyle,
    minWidth: 180,
    textAlign: 'center',
  };
  const barcodeCellStyle = {
    ...cellStyle,
    minWidth: 110,
    textAlign: 'center',
  };
  const importantCellStyle = {
    ...cellStyle,
    fontWeight: 600,
    color: '#1a1a1a',
  };

  // Helper function to generate a barcode
  const generateBarcode = (item: any) => {
    if (item.barcode) return item.barcode;
    // Generate a barcode using item ID or description
    const base = item.id || item.description || item.name || 'ITEM';
    return `BC-${base}-${Date.now()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <p className="mb-4">Please log in to view your inventory</p>
        <Button onClick={() => router.push('/auth/login')}>Log In</Button>
      </div>
    );
  }

  return (
    <div style={pageBgStyle}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={pageTitleStyle}>Inventory Dashboard</div>

        <Toaster position="top-right" />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Inventoryn mament</h1>
          <div className="flex gap-4">
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <ProductForm onSubmit={handleAddProduct} submitLabel="Add Product" />
              </DialogContent>
            </Dialog>

            <div className="relative">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    No products found. Add some products to get started!
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      {product.status === 'pending' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500">Length</span>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={product.length || ''}
                                onChange={(e) => {
                                  setProducts(prev => prev.map(p => 
                                    p.sku === product.sku ? { 
                                      ...p, 
                                      length: parseFloat(e.target.value) || null,
                                      dimensions: null
                                    } : p
                                  ));
                                }}
                                placeholder="0.0"
                                className="w-20 h-8"
                              />
                            </div>
                            <span className="text-gray-400 mt-6">×</span>
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500">Width</span>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={product.width || ''}
                                onChange={(e) => {
                                  setProducts(prev => prev.map(p => 
                                    p.sku === product.sku ? { 
                                      ...p, 
                                      width: parseFloat(e.target.value) || null,
                                      dimensions: null
                                    } : p
                                  ));
                                }}
                                placeholder="0.0"
                                className="w-20 h-8"
                              />
                            </div>
                            <span className="text-gray-400 mt-6">×</span>
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500">Height</span>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={product.height || ''}
                                onChange={(e) => {
                                  setProducts(prev => prev.map(p => 
                                    p.sku === product.sku ? { 
                                      ...p, 
                                      height: parseFloat(e.target.value) || null,
                                      dimensions: null
                                    } : p
                                  ));
                                }}
                                placeholder="0.0"
                                className="w-20 h-8"
                              />
                            </div>
                            <span className="text-sm text-gray-500 mt-6">cm</span>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-nowrap text-sm">
                          {product.dimensions || 
                           (product.length && product.width && product.height 
                             ? `${product.length} × ${product.width} × ${product.height} cm` 
                             : '-')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={product.weight || ''}
                            onChange={(e) => {
                              setProducts(prev => prev.map(p => 
                                p.sku === product.sku ? { ...p, weight: parseFloat(e.target.value) || null } : p
                              ));
                            }}
                            placeholder="Weight in kg"
                            className="w-24"
                          />
                        </div>
                      ) : (
                        product.weight ? `${product.weight}kg` : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {product.status === 'pending' ? (
                        <Select
                          value={product.category}
                          onValueChange={(value) => {
                            setProducts(prev => prev.map(p => 
                              p.sku === product.sku ? { ...p, category: value } : p
                            ));
                          }}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        product.category
                      )}
                    </TableCell>
                    <TableCell>
                      {product.status === 'pending' ? (
                        <Select
                          value={product.condition}
                          onValueChange={(value) => {
                            setProducts(prev => prev.map(p => 
                              p.sku === product.sku ? { ...p, condition: value } : p
                            ));
                          }}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select Condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITIONS.map((cond) => (
                              <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        product.condition
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {product.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSaveProduct(product)}
                            disabled={!product.category || !product.condition}
                          >
                            Save
                          </Button>
                        ) : (
                          <>
                            <Dialog 
                              open={editingProduct?.id === product.id} 
                              onOpenChange={(open) => !open && setEditingProduct(null)}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingProduct(product)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Product</DialogTitle>
                                </DialogHeader>
                                <ProductForm 
                                  initialData={product}
                                  onSubmit={(data) => handleEditProduct({
                                    ...data,
                                    id: product.id,
                                    client_id: product.client_id,
                                    sku: product.sku
                                  })}
                                  submitLabel="Save Changes"
                                />
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => product.id && handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Delivery Assigned Successfully</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* @ts-expect-error kjjm */}
              {lastDeliveryDetails?.shipping_label ? (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">Shipping Label</h3>
                  {/* @ts-expect-error kjjm */}
                      <p className="text-sm text-gray-500">Package ID: {lastDeliveryDetails.shipping_label.packageId}</p>
                    </div>
                    <Badge variant={
              // @ts-expect-error kjjm 
              lastDeliveryDetails.shipping_label.priority === 'high' ? 'destructive' :
              // @ts-expect-error kjjm 
                      lastDeliveryDetails.shipping_label.priority === 'medium' ? 'warning' : 'default'
                    }>
                  {/* @ts-expect-error kjjm */}
                
                      {lastDeliveryDetails.shipping_label.priority.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium">Pickup Details</h4>
                  {/* @ts-expect-error kjjm */}
                      <p className="text-sm">{lastDeliveryDetails.shipping_label.pickup.location}</p>
                      <p className="text-sm text-gray-500">
                  {/* @ts-expect-error kjjm */}
                        Time: {new Date(lastDeliveryDetails.shipping_label.pickup.time).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Delivery Details</h4>
                  {/* @ts-expect-error kjjm */}
                      <p className="text-sm">{lastDeliveryDetails.shipping_label.delivery.address}</p>
                  {/* @ts-expect-error kjjm */}
                      <p className="text-sm text-gray-500">Notes: {lastDeliveryDetails.shipping_label.delivery.notes}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium">Courier Information</h4>
                  {/* @ts-expect-error kjjm */}
                    <p className="text-sm">{lastDeliveryDetails.shipping_label.courier.name}</p>
                    <p className="text-sm text-gray-500">
                  {/* @ts-expect-error kjjm */}
                      Vehicle: {lastDeliveryDetails.shipping_label.courier.vehicle} | 
                  {/* @ts-expect-error kjjm */}
                      Phone: {lastDeliveryDetails.shipping_label.courier.phone}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium">Products</h4>
                    <div className="space-y-2">
                  {/* @ts-expect-error kjjm */}
                      {lastDeliveryDetails.shipping_label.products.map((product, index) => (
                        <div key={index} className="border rounded p-2">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            Quantity: {product.quantity} | 
                            {product.dimensions && `Dimensions: ${product.dimensions}`} |
                            {product.weight && `Weight: ${product.weight}kg`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t pt-2">
                    <div>
                  {/* @ts-expect-error kjjm */}
                      <p className="text-sm">Total Weight: {lastDeliveryDetails.shipping_label.totalWeight}kg</p>
                  {/* @ts-expect-error kjjm */}
                      <p className="text-sm text-gray-500">Created: {new Date(lastDeliveryDetails.shipping_label.createdAt).toLocaleString()}</p>
                    </div>
                    <Button onClick={() => window.print()} variant="outline">
                      Print Label
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium">Delivery Details</h3>
                  {/* @ts-expect-error kjjm */}
              
                  <p>Package ID: {lastDeliveryDetails?.package_id}</p>
                  <p>Priority: {lastDeliveryDetails?.priority}</p>
                  <p>Status: {lastDeliveryDetails?.status}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium">Selected Products</h3>
                <ul className="list-disc pl-4">
                  {selectedProducts.map((product, index) => (
                    <li key={index}>
                      {product.name} - Quantity: {product.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <Button onClick={() => setShowSuccessDialog(false)} className="w-full">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Truck Items with Arrival Info Table */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>Warehouse Operation Data</div>
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, borderRadius: 12, minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Vehicle Registration</th>
                  <th style={headerCellStyle}>Customer Name</th>
                  <th style={headerCellStyle}>Driver Name</th>
                  <th style={headerCellStyle}>Vehicle Size</th>
                  <th style={headerCellStyle}>Load Type</th>
                  <th style={headerCellStyle}>Arrival Time</th>
                  <th style={headerCellStyle}>Warehouse</th>
                  <th style={headerCellStyle}>Description</th>
                  <th style={headerCellStyle}>Quantity</th>
                  <th style={headerCellStyle}>Condition</th>
                  <th style={headerCellStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {truckItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      No warehouse operation data found
                    </td>
                  </tr>
                ) : (
                  truckItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={Object.assign({}, tableRowStyle, idx % 2 === 1 ? { background: '#f9fafb' } : {})}
                      onMouseOver={e => (e.currentTarget.style.background = '#f5f7fa')}
                      onMouseOut={e => (e.currentTarget.style.background = idx % 2 === 1 ? '#f9fafb' : '#fff')}
                    >
                      <td style={cellStyle}>{item.truck_arrival?.vehicle_registration || ''}</td>
                      <td style={cellStyle}>{item.truck_arrival?.customer_name || ''}</td>
                      <td style={cellStyle}>{item.truck_arrival?.driver_name || ''}</td>
                      <td style={cellStyle}>{item.truck_arrival?.vehicle_size || ''}</td>
                      <td style={cellStyle}>{item.truck_arrival?.load_type || ''}</td>
                      <td style={cellStyle}>{item.truck_arrival?.arrival_time ? new Date(item.truck_arrival.arrival_time).toLocaleString() : ''}</td>
                      <td style={cellStyle} title={item.truck_arrival?.warehouse_id || ''}>
                        <span style={{ fontSize: 13, color: '#888' }}>{item.truck_arrival?.warehouse_id || ''}</span>
                      </td>
                      <td style={importantCellStyle} title={item.description || item.name || ''}>
                        {item.description || item.name || ''}
                      </td>
                      <td style={cellStyle}>{item.quantity || ''}</td>
                      <td style={cellStyle}>{item.condition || ''}</td>
                  {/* @ts-expect-error kjjm */}
                      <td style={actionCellStyle}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Button size="sm" variant="outline" onClick={() => setEditingTruckItem(item)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setTruckItemToDelete(item); setShowDeleteTruckDialog(true); }}>
                            Delete
                          </Button>
                          <Button size="sm" variant="default" onClick={() => setLabelItem(item)}>
                            Label
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Truck Item Dialog */}
        <Dialog open={!!editingTruckItem} onOpenChange={(open) => {
          if (!open) setEditingTruckItem(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            {editingTruckItem && (
              <form onSubmit={e => {
                e.preventDefault();
                handleEditTruckItem({
                  description: e.currentTarget.description.value,
                  quantity: parseInt(e.currentTarget.quantity.value),
                  condition: e.currentTarget.condition.value
                });
                setEditingTruckItem(null);
              }} className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Input name="description" defaultValue={editingTruckItem.description || editingTruckItem.name} required />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input name="quantity" type="number" min="0" defaultValue={editingTruckItem.quantity} required />
                </div>
                <div>
                  <Label>Condition</Label>
                  <Input name="condition" defaultValue={editingTruckItem.condition} required />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditingTruckItem(null)}>Cancel</Button>
                  <Button type="submit" variant="default">Save</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteTruckDialog} onOpenChange={setShowDeleteTruckDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Item</DialogTitle>
            </DialogHeader>
            <div>Are you sure you want to delete <b>{truckItemToDelete?.description || truckItemToDelete?.name}</b>?</div>
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="outline" onClick={() => setShowDeleteTruckDialog(false)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={async () => {
                await handleDeleteTruckItem();
                setShowDeleteTruckDialog(false);
              }}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Label Dialog */}
        <Dialog open={!!labelItem} onOpenChange={(open) => !open && setLabelItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Warehouse Item Label</DialogTitle>
            </DialogHeader>
            {labelItem && (
              <div
                id="print-label"
                style={{
                  width: 340,
                  border: '2px solid #222',
                  borderRadius: 16,
                  background: '#fff',
                  color: '#222',
                  fontFamily: 'Segoe UI, Arial, sans-serif',
                  fontSize: 16,
                  margin: '0 auto',
                  padding: 18,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  position: 'relative',
                  minHeight: 420
                }}
              >
                {/* Logo or Company Name */}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  {companyLogoUrl ? (
                    <img src={companyLogoUrl} alt="Logo" style={{ maxHeight: 40, margin: '0 auto', display: 'block' }} />
                  ) : null}
                  <div style={{ fontWeight: 700, fontSize: 26, letterSpacing: 1, marginTop: companyLogoUrl ? 4 : 0 }}>
                    {getCompanyName(labelItem)}
                  </div>
                </div>
                {/* Divider */}
                <div style={{ borderBottom: '1.5px solid #bbb', margin: '8px 0 10px 0' }} />
                {/* Driver/Time Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 500 }}>Driver Reg:</span>
                  <span style={{ fontWeight: 700 }}>{labelItem.truck_arrival?.vehicle_registration || ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 500 }}>Shipment Time:</span>
                  <span style={{ fontWeight: 700 }}>{labelItem.truck_arrival?.arrival_time ? new Date(labelItem.truck_arrival.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                {/* Location Section */}
                <div style={{ borderBottom: '1.5px solid #bbb', margin: '10px 0 10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>Location:</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>Aisle: <b>{labelItem.aisle || '-'}</b></span>
                  <span>Bay: <b>{labelItem.bay || '-'}</b></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Shelf: <b>{labelItem.shelf || '-'}</b></span>
                  <span></span>
                </div>
                {/* Item Section */}
                <div style={{ borderBottom: '1.5px solid #bbb', margin: '10px 0 10px 0' }} />
                <div style={{ fontWeight: 600, textAlign: 'center', fontSize: 18, marginBottom: 2 }}>{labelItem.description || labelItem.name || ''}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Qty: <b>{labelItem.quantity || ''}</b></span>
                  <span>Cond: <b>{labelItem.condition || ''}</b></span>
                </div>
                {/* Barcode Section - Always show */}
                <div style={{
                  textAlign: 'center',
                  padding: '16px 0 0 0',
                  borderTop: '1.5px solid #bbb',
                  marginTop: 10
                }}>
                  {(() => {
                    const barcode = generateBarcode(labelItem);
                    return (
                      <>
                        <img 
                          src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcode)}&code=Code128&translate-esc=true`} 
                          alt="Barcode" 
                          style={{ height: 54, margin: '0 auto', display: 'block' }} 
                        />
                        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, marginTop: 2 }}>{barcode}</div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="outline" onClick={() => setLabelItem(null)}>Close</Button>
              <Button type="button" variant="default" onClick={() => {
                const printContents = document.getElementById('print-label')?.innerHTML;
                const win = window.open('', '', 'height=600,width=400');
                if (win && printContents) {
                  win.document.write('<html><head><title>Label</title></head><body>' + printContents + '</body></html>');
                  win.document.close();
                  win.focus();
                  win.print();
                  win.close();
                }
              }}>Print/Download Label</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Product Form component
const ProductForm = ({ 
  onSubmit, 
  initialData = null,
  submitLabel = 'Add Product'
}: { 
  onSubmit: (data: Omit<Product, 'id' | 'client_id' | 'sku'>) => void;
  initialData?: Product | null;
  submitLabel: string;
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    price: initialData?.price || '',
    quantity: initialData?.quantity || '',
    category: initialData?.category || '',
    condition: initialData?.condition || '',
    length: '',
    width: '',
    height: initialData?.height?.toString() || '',
    weight: initialData?.weight?.toString() || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    const price = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    const quantity = typeof formData.quantity === 'string' ? parseInt(formData.quantity.toString()) : formData.quantity;
    const height = formData.height ? parseFloat(formData.height.toString()) : null;
    const weight = formData.weight ? parseFloat(formData.weight.toString()) : null;
    
    // Combine dimensions only if all values are present
    const dimensions = (formData.length && formData.width && formData.height)
      ? `${formData.length}x${formData.width}x${formData.height} cm`
      : null;

    if (isNaN(price)) {
      toast.error('Please enter a valid price');
      return;
    }

    if (isNaN(quantity)) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    if (!formData.condition) {
      toast.error('Please select a condition');
      return;
    }

    onSubmit({
      name: formData.name,
      price,
      quantity,
      category: formData.category,
      condition: formData.condition,
      height,
      weight,
      dimensions,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      status: 'pending'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Product name"
        />
      </div>
      <div>
        <Label>Price</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          required
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="0.00"
        />
      </div>
      <div>
        <Label>Quantity</Label>
        <Input
          type="number"
          min="0"
          required
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label className="block text-sm font-medium">Dimensions</Label>
        <div className="flex items-center gap-2">
          <div className="flex flex-col flex-1">
            <span className="text-xs text-gray-500 mb-1">Length</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              placeholder="0.0"
              className="h-9"
            />
          </div>
          <span className="text-gray-400 mt-6">×</span>
          <div className="flex flex-col flex-1">
            <span className="text-xs text-gray-500 mb-1">Width</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formData.width}
              onChange={(e) => setFormData({ ...formData, width: e.target.value })}
              placeholder="0.0"
              className="h-9"
            />
          </div>
          <span className="text-gray-400 mt-6">×</span>
          <div className="flex flex-col flex-1">
            <span className="text-xs text-gray-500 mb-1">Height</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              placeholder="0.0"
              className="h-9"
            />
          </div>
          <span className="text-sm text-gray-500 mt-6">cm</span>
        </div>
      </div>
      <div>
        <Label>Weight (kg)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.weight}
          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
          placeholder="Weight in kilograms"
        />
      </div>
      <div>
        <Label>Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Condition</Label>
        <Select
          value={formData.condition}
          onValueChange={(value) => setFormData({ ...formData, condition: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Condition" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((cond) => (
              <SelectItem key={cond} value={cond}>{cond}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}; 