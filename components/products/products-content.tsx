'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Edit, Trash2, Plus, Barcode, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { supabase } from './SupabaseClient';
import { useUser } from '@/lib/hooks/use-user';
import { Spinner } from '@/components/ui/spinner';

const CONDITIONS = ['New', 'Like New', 'Used', 'Refurbished', 'For Parts'];
const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];
const LOCATIONS = ['London', 'Manchester', 'Birmingham'];

interface Product {
  id: string;
  client_id: string;
  name: string;
  sku: string;
  price?: number;
  quantity?: number;
  barcode?: string;
  condition?: string;
  category?: string;
  description?: string;
  created_at?: string;
  user_id?: string;
  saved?: boolean;
  isSaved: boolean;
}

interface Client {
  id: string;
  email: string;
  password: string;
  company: string;
  status: string;
  created_at?: string;
}

export function ProductsContent() {
  const { user } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [uploadedProducts, setUploadedProducts] = useState<any[]>([]);

  const generateBarcode = () => {
    // Generate a unique 13-digit barcode
    return Math.floor(Math.random() * 9000000000000) + 1000000000000;
  };

  const generateSKU = () => {
    const timestamp = new Date().getTime();
    return `SKU-${timestamp.toString(36).toUpperCase()}`;
  };

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  // Fetch or create client on component mount
  useEffect(() => {
    const initializeClient = async () => {
      if (!user?.email) {
        console.log('No user email found');
        setLoading(false);
        return;
      }
      
      try {
        console.log('Fetching client for email:', user.email);
        
        // First check if client exists
        const { data: existingClient, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('email', user.email)
          .single();

        if (clientError) {
          console.log('Error fetching client:', clientError);
          // If no client found, create new client
          if (clientError.code === 'PGRST116') {
            console.log('Creating new client');
            const { data: newClient, error: createError } = await supabase
              .from('clients')
              .insert([{ email: user.email }])
              .select()
              .single();

            if (createError) throw createError;
            
            console.log('New client created:', newClient);
            setClientId(newClient.id);
            setProducts([]);
          } else {
            throw clientError;
          }
        } else if (existingClient) {
          console.log('Existing client found:', existingClient);
          setClientId(existingClient.id);
          
          // Fetch products for existing client
          const { data: clientProducts, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('client_id', existingClient.id);

          if (productsError) throw productsError;
          
          console.log('Products fetched:', clientProducts);
          setProducts(clientProducts || []);
        }
      } catch (error) {
        console.error('Error in initializeClient:', error);
        toast.error('Failed to initialize client data');
      } finally {
        setLoading(false);
      }
    };

    initializeClient();
  }, [user?.email]);

  // Debug logging
  useEffect(() => {
    console.log('Current state:', {
      user,
      clientId,
      productsCount: products.length,
      loading
    });
  }, [user, clientId, products, loading]);

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'client_id' | 'sku'>) => {
    if (!clientId) {
      toast.error('Please wait while we initialize your account');
      return;
    }

    try {
      const newProduct = {
        client_id: clientId,
        name: productData.name,
        sku: generateSKU(),
        price: productData.price || 0,
        quantity: productData.quantity || 0,
        category: productData.category,
        condition: productData.condition,
        barcode: generateBarcode().toString(),
        description: productData.description
      };

      const { data, error } = await supabase
        .from('products')
        .insert(newProduct)
        .select()
        .single();

      if (error) throw error;

      setProducts(currentProducts => [
        ...currentProducts,
        { ...data, isSaved: true }
      ]);

      setIsAddProductOpen(false);
      toast.success('Product added successfully');
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(`Failed to add product: ${error.message}`);
    }
  };

  const handleEditProduct = async (editedProduct: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editedProduct.name,
          price: editedProduct.price,
          quantity: editedProduct.quantity,
          category: editedProduct.category,
          condition: editedProduct.condition
        })
        .eq('id', editedProduct.id);

      if (error) throw error;

      setProducts(products.map(p => 
        p.id === editedProduct.id ? editedProduct : p
      ));
      setEditingProduct(null);
      toast.success('Product updated successfully');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(`Failed to update product: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted successfully');
      await fetchUserProducts(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(`Failed to delete product: ${error.message}`);
    }
  };

  const calculateAveragePrice = (products: any[]) => {
    const validPrices = products
      .map(row => {
        let price = row['Sale Price'] || row.price || 0;
        if (typeof price === 'string') {
          price = price.replace(/£|\+VAT/g, '').trim();
          return parseFloat(price) || 0;
        }
        return price;
      })
      .filter(price => price > 0);

    return validPrices.length ? 
      validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 
      0;
  };

  const processExcelFile = async (file: File) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      toast.error('User not authenticated');
      return;
    }

    const user = JSON.parse(userStr);
    const loadingToast = toast.loading('Processing file...');
    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        const processedProducts = rows
          .filter((row: any) => {
            let price = row['Sale Price'] || row.price || 0;
            if (typeof price === 'string') {
              price = parseFloat(price.replace(/£|\+VAT/g, '').trim()) || 0;
            }
            const quantity = parseInt(row.Quantity) || 0;
            
            return row.Description && price > 0 && quantity > 0;
          })
          .map((row: any) => ({
            id: crypto.randomUUID(),
            name: row.Description || row.name,
            price: parseFloat(row.price || row['Sale Price'] || '0'),
            quantity: parseInt(row.Quantity || '0'),
            condition: '',
            category: '',
            barcode: generateBarcode().toString(),
            isSaved: false
          }));

        if (processedProducts.length > 0) {
          // @ts-expect-error hmkj kj
          setProducts(prev => [...prev, ...processedProducts]);
          toast.success(`Processed ${processedProducts.length} products. Please select categories and conditions.`, {
            id: loadingToast,
          });
        } else {
          toast.error('No valid products found. Please check the file format.', {
            id: loadingToast,
          });
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error(`Error processing file: ${error.message}`, {
        id: loadingToast,
      });
    } finally {
      setIsUploading(false);
      toast.dismiss(loadingToast);
    }
  };

  const saveToSupabase = async (product: Product, index: number) => {
    try {
      if (!clientId) {
        toast.error('Client information not available');
        return;
      }

      const productData = {
        client_id: clientId,
        name: product.name,
        sku: product.sku || generateSKU(),
        price: product.price || 0,
        quantity: product.quantity || 0,
        barcode: product.barcode,
        condition: product.condition,
        category: product.category,
        description: product.description
      };

      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update the product in the local state to show it's been saved
      // but keep it in the list
      const updatedProducts = [...products];
      updatedProducts[index] = { ...updatedProducts[index], saved: true };
      setProducts(updatedProducts);

      toast.success('Product saved successfully');
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Failed to save product: ${error.message}`);
    }
  };

  const updateProductInSupabase = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          category: product.category,
          condition: product.condition
        })
        .eq('id', product.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(`Failed to update product: ${error.message}`);
    }
  };

  const fetchUserProducts = async () => {
    try {
      if (!clientId) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      if (data) setProducts(data);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(`Failed to fetch products: ${error.message}`);
    }
  };

  // Filter products based on search query and selected category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle category change
  const handleCategoryChange = async (value: string, index: number) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      category: value
    };
    setProducts(updatedProducts);
    
    // Check if both category and condition are selected
    if (updatedProducts[index].condition && value) {
      await saveProductToDatabase(updatedProducts[index], index);
    }
  };

  // Handle condition change
  const handleConditionChange = async (value: string, index: number) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      condition: value
    };
    setProducts(updatedProducts);
    
    // Check if both category and condition are selected
    if (updatedProducts[index].category && value) {
      await saveProductToDatabase(updatedProducts[index], index);
    }
  };

  // Save product to database
  const saveProductToDatabase = async (product: Product, index: number) => {
    try {
      if (!clientId) {
        toast.error('Client information not available');
        return;
      }

      const productData = {
        client_id: clientId,
        name: product.name,
        sku: product.sku || generateSKU(),
        price: product.price || 0,
        quantity: product.quantity || 0,
        barcode: product.barcode,
        condition: product.condition,
        category: product.category,
        description: product.description
      };

      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;

      // Update the product in the list with saved status
      const updatedProducts = [...products];
      updatedProducts[index] = {
        ...data,
        isSaved: true
      };
      setProducts(updatedProducts);
      
      toast.success('Product saved successfully');
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Failed to save product: ${error.message}`);
    }
  };

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-12 px-4">
      <div className="max-w-md mx-auto">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No products added yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Get started by adding your first product or upload in bulk using Excel.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <ProductForm onSubmit={handleAddProduct} />
            </DialogContent>
          </Dialog>

          <Button className="relative" disabled={isUploading}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processExcelFile(file);
              }}
            />
          </Button>
        </div>
      </div>
    </div>
  );

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="h-8 w-8 mb-4" />
          <p>Initializing your inventory...</p>
        </div>
      </div>
    );
  }

  // Render empty state for new clients
  if (products.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold mb-2">Welcome to Your Inventory</h3>
        <p className="text-gray-600 mb-4">Get started by adding your first product</p>
        <div className="flex justify-center gap-4">
          <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product Manually
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <ProductForm onSubmit={handleAddProduct} />
            </DialogContent>
          </Dialog>
          
          <Button onClick={() => setIsAddProductOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Excel File
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      
      {/* Header with search and category filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {products.length > 0 && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <ProductForm onSubmit={handleAddProduct} />
              </DialogContent>
            </Dialog>

            <Button className="w-full sm:w-auto" disabled={isUploading}>
              <Upload className="mr-2 h-4 w-4" />
              <label className="cursor-pointer">
                Upload Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processExcelFile(file);
                  }}
                />
              </label>
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, index) => {
                const isExistingProduct = Boolean(product.id); // Check if product has an ID (means it's saved)
                
                return (
                  <TableRow 
                    key={product.id || index}
                    className={product.isSaved ? 'bg-green-50' : ''}
                  >
                    <TableCell className="font-medium">{product.name}</TableCell>
                    {/* @ts-expect-error kjkn */}
                    <TableCell>£{product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      {product.isSaved ? (
                        <span className="px-2 py-1 bg-gray-100 rounded-md">
                          {product.category}
                        </span>
                      ) : (
                        <Select
                          value={product.category}
                          onValueChange={(value) => handleCategoryChange(value, index)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.isSaved ? (
                        <span className="px-2 py-1 bg-gray-100 rounded-md">
                          {product.condition}
                        </span>
                      ) : (
                        <Select
                          value={product.condition}
                          onValueChange={(value) => handleConditionChange(value, index)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITIONS.map((condition) => (
                              <SelectItem key={condition} value={condition}>
                                {condition}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast(
                            <div className="space-y-2">
                              <div className="text-lg font-bold">Product Details</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="font-semibold">Barcode:</div>
                                <div>{product.barcode}</div>
                                <div className="font-semibold">Name:</div>
                                <div>{product.name}</div>
                                <div className="font-semibold">Price:</div>
                    {/* @ts-expect-error kjkn */}
                                <div>£{product.price.toFixed(2)}</div>
                                <div className="font-semibold">Quantity:</div>
                                <div>{product.quantity}</div>
                                <div className="font-semibold">Category:</div>
                                <div>{product.category}</div>
                                <div className="font-semibold">Condition:</div>
                                <div>{product.condition}</div>
                              </div>
                            </div>,
                            { duration: 5000 }
                          );
                        }}
                      >
                        <Barcode className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      {product.isSaved ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          Saved
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {product.isSaved && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    name: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    price: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={editingProduct.quantity}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    quantity: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label>Category</Label>
                {editingProduct.category ? (
                  <div className="p-2 border rounded-md">{editingProduct.category}</div>
                ) : (
                  <Select
                    value={editingProduct.category}
                    onValueChange={(value) => setEditingProduct({
                      ...editingProduct,
                      category: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Condition</Label>
                {editingProduct.condition ? (
                  <div className="p-2 border rounded-md">{editingProduct.condition}</div>
                ) : (
                  <Select
                    value={editingProduct.condition}
                    onValueChange={(value) => setEditingProduct({
                      ...editingProduct,
                      condition: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button onClick={() => {
                const updatedProducts = products.map(p => 
                  p.id === editingProduct.id ? editingProduct : p
                );
                setProducts(updatedProducts);
                setEditingProduct(null);
                toast.success('Product updated successfully');
              }}>
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({ onSubmit, initialData }: { 
  onSubmit: (data: any) => void;
  initialData?: Product;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    price: initialData?.price || 0,
    quantity: initialData?.quantity || 0,
    condition: initialData?.condition || '',
    category: initialData?.category || '',
    description: initialData?.description || ''
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <div>
        <Label>Name *</Label>
        <Input
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label>Price *</Label>
        <Input
          type="number"
          step="0.01"
          required
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
        />
      </div>
      <div>
        <Label>Quantity *</Label>
        <Input
          type="number"
          required
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
        />
      </div>
      <div>
        <Label>Category *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Condition *</Label>
        <Select
          value={formData.condition}
          onValueChange={(value) => setFormData({ ...formData, condition: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Condition" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((condition) => (
              <SelectItem key={condition} value={condition}>
                {condition}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full">
        Add Product
      </Button>
    </form>
  );
}