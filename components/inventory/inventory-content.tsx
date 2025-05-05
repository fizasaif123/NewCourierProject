'use client';

import { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const CONDITIONS = ['New', 'Like New', 'Used', 'Refurbished', 'For Parts'];
const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Other'];

export function InventoryContent() {
  console.log('InventoryContent mounted');
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch products from Supabase
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching products",
        content: error.message,
        variant: "destructive"
      });
      return;
    }

    setProducts(data || []);
  };

  // Fetch warehouse items with all related data
  const fetchWarehouseItems = async () => {
    console.log('Fetching warehouse items...');
    const { data, error } = await supabase
      .from('warehouse_items')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Warehouse items data:', data);
    console.log('Warehouse items error:', error);

    if (error) {
      toast({
        title: "Error fetching warehouse items",
        content: error.message,
        variant: "destructive"
      });
      return;
    }

    setWarehouseItems(data || []);
  };

  useEffect(() => {
    console.log('Initial fetch...');
    fetchProducts();
    fetchWarehouseItems();
  }, []);

  // Process Excel file
  const processExcelFile = async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        // Group products by name to handle duplicates
        const productGroups = rows.reduce((acc: any, row: any) => {
          const name = row.name || row.product_name || row.item;
          if (!name) return acc;

          if (!acc[name]) {
            acc[name] = {
              prices: [],
              quantities: []
            };
          }

          const price = parseFloat(row.price);
          const quantity = parseInt(row.quantity);

          if (!isNaN(price)) acc[name].prices.push(price);
          if (!isNaN(quantity)) acc[name].quantities.push(quantity);

          return acc;
        }, {});

        // Process each unique product
        // @ts-expect-error kj kjn
        for (const [productName, data] of Object.entries(productGroups)) {
          // @ts-expect-error kj kjn
          const avgPrice = data.prices.length > 0 
          // @ts-expect-error kj kjn
          ? data.prices.reduce((a: number, b: number) => a + b) / data.prices.length 
          : 0;
          // @ts-expect-error kj kjn
          const totalQuantity = data.quantities.length > 0 
          // @ts-expect-error kj kjn
            ? data.quantities.reduce((a: number, b: number) => a + b) 
            : 0;

          // Check if product exists
          const { data: existingProduct } = await supabase
            .from('products')
            .select('*')
            .eq('name', productName)
            .single();

          if (existingProduct) {
            // Update existing product
            const newQuantity = existingProduct.total_quantity + totalQuantity;
            const newPrice = (existingProduct.average_price * existingProduct.total_quantity + avgPrice * totalQuantity) / newQuantity;

            await supabase
              .from('products')
              .update({
                average_price: newPrice,
                total_quantity: newQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProduct.id);
          } else {
            // Create new product
            await supabase
              .from('products')
              .insert({
                name: productName,
                code: `SKU${Date.now()}`,
                average_price: avgPrice,
                total_quantity: totalQuantity
              });
          }
        }

        await fetchProducts();
        toast({
          title: "Upload successful",
          content: `Processed ${rows.length} rows from ${file.name}`,
        });
      };

      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        content: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Update product details
  const updateProduct = async (productId: string, updates: any) => {
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);

    if (error) {
      toast({
        title: "Update failed",
        content: error.message,
        variant: "destructive"
      });
      return;
    }

    await fetchProducts();
  };

  return (
    <div className="space-y-6 p-4">
      <div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-2 text-center">
        InventoryContent component is rendering
      </div>
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Upload Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processExcelFile(file);
              }}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="flex items-center gap-2">
                <Upload className="animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    <Select
                      value={product.category || ''}
                      onValueChange={(value) => 
                        updateProduct(product.id, { category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={product.condition || ''}
                      onValueChange={(value) => 
                        updateProduct(product.id, { condition: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((cond) => (
                          <SelectItem key={cond} value={cond}>
                            {cond}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>£{product.average_price?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>{product.total_quantity || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Warehouse Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Operations ({warehouseItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {warehouseItems.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No warehouse operations found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.condition}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'ok' ? 'success' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}