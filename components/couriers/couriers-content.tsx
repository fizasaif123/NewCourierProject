'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
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
  DialogDescription,
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Plus, Package, Pencil, Trash2, MapPin, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import dynamic from 'next/dynamic';
import { RouteOptimizer } from './route-optimizer';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { PODManagement } from "./pod-management";

// Mock data
const mockCouriers = [
  {
    id: 'C1',
    name: 'John Doe',
    vehicle: 'Van',
    status: 'inactive',
    currentLocation: 'London, UK',
    destination: '',
    eta: null,
    phone: '+44 7700 900123',
  },
  {
    id: 'C2',
    name: 'Sarah Smith',
    vehicle: 'Truck',
    status: 'active',
    currentLocation: 'Manchester, UK',
    destination: 'Birmingham, UK',
    eta: new Date(Date.now() + 90 * 60000),
    phone: '+44 7700 900124',
  },
  {
    id: 'C3',
    name: 'Mike Johnson',
    vehicle: 'Motorcycle',
    status: 'inactive',
    currentLocation: 'Leeds, UK',
    destination: '',
    eta: null,
    phone: '+44 7700 900125',
  },
  {
    id: 'C4',
    name: 'Emma Wilson',
    vehicle: 'Van',
    status: 'active',
    currentLocation: 'Bristol, UK',
    destination: 'Cardiff, UK',
    eta: new Date(Date.now() + 60 * 60000),
    phone: '+44 7700 900126',
  },
  {
    id: 'C5',
    name: 'James Brown',
    vehicle: 'Truck',
    status: 'inactive',
    currentLocation: 'Glasgow, UK',
    destination: '',
    eta: null,
    phone: '+44 7700 900127',
  }
];

const mockWarehouses = [
  {
    id: 'W1',
    name: 'London Central Warehouse',
    location: 'London, UK',
    coordinates: [51.5074, -0.1278],
  },
  {
    id: 'W2',
    name: 'Manchester Distribution Center',
    location: 'Manchester, UK',
    coordinates: [53.4808, -2.2426],
  },
  {
    id: 'W3',
    name: 'Birmingham Hub',
    location: 'Birmingham, UK',
    coordinates: [52.4862, -1.8904],
  },
  {
    id: 'W4',
    name: 'Leeds Logistics Center',
    location: 'Leeds, UK',
    coordinates: [53.8008, -1.5491],
  },
  {
    id: 'W5',
    name: 'Glasgow Storage Facility',
    location: 'Glasgow, UK',
    coordinates: [55.8642, -4.2518],
  },
  {
    id: 'W6',
    name: 'Cardiff Distribution Hub',
    location: 'Cardiff, UK',
    coordinates: [51.4816, -3.1791],
  },
  {
    id: 'W7',
    name: 'Edinburgh Warehouse',
    location: 'Edinburgh, UK',
    coordinates: [55.9533, -3.1883],
  }
];

const FIXED_PRODUCTS = [
  'ARMY PUFFER JACKET FEMALE(RMAS Sandhurst)',
  'ARMY PUFFER JACKET MALE(RMAS Sandhurst)',
  'ARMY SOFTSHELL JACKET FEMALE(RMAS Sandhurst)',
  'ARMY SOFTSHELL JACKET MALE(RMAS Sandhurst)',
  'ARMY PT WICKING T SHIRT FEMALE(RMAS Sandhurst)',
  'ARMY PT WICKING T SHIRT MALE(RMAS Sandhurst)',
  'ARMY THERMAL BASE LAYER FEMALE(RMAS Sandhurst)',
  'ARMY THERMAL BASE LAYER MALE(RMAS Sandhurst)',
].map((name, index) => ({
  id: `P${(index + 1).toString().padStart(5, '0')}`,
  name,
  quantity: Math.floor(Math.random() * 200) + 1,
  category: 'Clothing',
  price: (Math.random() * 100).toFixed(2),
  barcode: `1234567890${(index + 1).toString().padStart(2, '0')}`,
}));

// Add this interface for the courier form
interface CourierFormData {
  name: string;
  phone: string;
  vehicle: string;
}

// Add this component for the courier form
function CourierForm({ onSubmit, isLoading, initialData }: { onSubmit: (data: CourierFormData) => void, isLoading: boolean, initialData?: CourierFormData }) {
  const [formData, setFormData] = useState<CourierFormData>(
    initialData || {
      name: '',
      phone: '',
      vehicle: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter courier name"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Enter phone number"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="vehicle">Vehicle Type</Label>
        <Select
          value={formData.vehicle}
          onValueChange={(value) => setFormData({ ...formData, vehicle: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select vehicle type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Van">Van</SelectItem>
            <SelectItem value="Truck">Truck</SelectItem>
            <SelectItem value="Motorcycle">Motorcycle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner /> : 'Add Courier'}
      </Button>
    </form>
  );
}

const CourierMap = dynamic(() => import('./courier-map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted/50 rounded-lg">Loading map...</div>
});

// Add this type
interface OptimizedRouteDetails {
  originalRoute: {
    distance: number;
    duration: number;
    fuelCost: number;
  };
  optimizedRoute: {
    distance: number;
    duration: number;
    fuelCost: number;
    name: string;
  };
}

export function CouriersContent() {
  const { toast } = useToast();
  
  // State management
  const [couriers, setCouriers] = useState(mockCouriers);
  const [selectedCourier, setSelectedCourier] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCourier, setEditingCourier] = useState<any | null>(null);
  const [deletingCourierId, setDeletingCourierId] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({});
  const [deliveryType, setDeliveryType] = useState('warehouse');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationWarehouse, setDestinationWarehouse] = useState('');
  const [assignmentLogs, setAssignmentLogs] = useState<Array<{
    trackingNo: string;
    courier: string;
    products: string;
    from: string;
    to: string;
    date: Date;
    optimizedRoute?: any;
    originalRoute?: {
      distance: number;
      duration: number;
      fuelCost: number;
    };
  }>>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false);

  // Helper functions
  const generateTrackingNumber = () => {
    const date = new Date();
    const dateStr = date.getFullYear().toString().substr(-2) +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TRK-${dateStr}-${random}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatETA = (eta: Date) => {
    if (!eta) return 'N/A';
    return new Date(eta).toLocaleTimeString();
  };

  const handleAssignCourier = () => {
    // Input validation
    if (!selectedWarehouse) {
      toast({
        title: "Error",
        content: "Please select a source warehouse",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCourierId) {
      toast({
        title: "Error",
        content: "Please select a courier",
        variant: "destructive",
      });
      return;
    }

    if (Object.keys(selectedProducts).length === 0) {
      toast({
        title: "Error",
        content: "Please select at least one product",
        variant: "destructive",
      });
      return;
    }

    if (deliveryType === 'warehouse' && !destinationWarehouse) {
      toast({
        title: "Error",
        content: "Please select a destination warehouse",
        variant: "destructive",
      });
      return;
    }

    if (deliveryType === 'client' && !destinationAddress) {
      toast({
        title: "Error",
        content: "Please enter the client's address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const trackingNo = generateTrackingNumber();
      const selectedCourier = couriers.find(c => c.id === selectedCourierId);
      const sourceWarehouse = mockWarehouses.find(w => w.id === selectedWarehouse);
      
      // Create assignment log
      const newLog = {
        trackingNo,
        courier: selectedCourier?.name || '',
        products: Object.entries(selectedProducts)
          .map(([id, qty]) => {
            const product = FIXED_PRODUCTS.find(p => p.id === id);
            return `${product?.name} (${qty})`;
          })
          .join(', '),
        from: sourceWarehouse?.name || '',
        to: deliveryType === 'warehouse' ? 
          mockWarehouses.find(w => w.id === destinationWarehouse)?.name || '' : 
          destinationAddress,
        date: new Date(),
      };

      setAssignmentLogs([newLog, ...assignmentLogs]);

      // Update courier status and destination
      setCouriers(couriers.map(c => {
        if (c.id === selectedCourierId) {
          return {
            ...c,
            status: 'active',
            currentLocation: sourceWarehouse?.location || '',
            destination: deliveryType === 'warehouse' ? 
              mockWarehouses.find(w => w.id === destinationWarehouse)?.location || '' :
              destinationAddress,
            eta: new Date(Date.now() + 120 * 60000), // 2 hours from now
          };
        }
        return c;
      }));

      // Show success message
      toast({
        title: "Success",
        content: `Courier successfully assigned. Tracking No: ${trackingNo}. You can now track deliveries.`,
      });

      // Reset form
      setSelectedWarehouse('');
      setSelectedCourierId('');
      setSelectedProducts({});
      setDeliveryType('warehouse');
      setDestinationAddress('');
      setDestinationWarehouse('');
      setIsAssignDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        content: "Failed to assign courier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the handleAddCourier function in CouriersContent
  const handleAddCourier = async (data: CourierFormData) => {
    try {
      setIsLoading(true);
      
      // Generate a new ID (in a real app, this would come from the backend)
      const newId = `C${couriers.length + 1}`;
      
      const newCourier = {
        id: newId,
        name: data.name,
        phone: data.phone,
        vehicle: data.vehicle,
        status: 'inactive',
        currentLocation: '',
        destination: '',
        eta: null,
      };

      setCouriers([...couriers, newCourier]);
      setShowAddDialog(false);
      
      toast({
        title: "Success",
        content: "Courier added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        content: "Failed to add courier",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Edit Courier
  const handleEditCourier = async (data: CourierFormData) => {
    try {
      setIsLoading(true);
      
      setCouriers(couriers.map(courier => 
        courier.id === editingCourier?.id 
          ? {
              ...courier,
              name: data.name,
              phone: data.phone,
              vehicle: data.vehicle,
            }
          : courier
      ));
      
      setEditingCourier(null);
      
      toast({
        title: "Success",
        content: "Courier updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        content: "Failed to update courier",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete Courier
  const handleDeleteCourier = async () => {
    try {
      setIsLoading(true);
      
      setCouriers(couriers.filter(courier => courier.id !== deletingCourierId));
      setDeletingCourierId(null);
      
      toast({
        title: "Success",
        content: "Courier deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        content: "Failed to delete courier",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function
  const handleRouteOptimization = (log: any) => {
    setSelectedAssignment(log);
    setShowRouteOptimizer(true);
  };

  const handleRouteSelect = (route: any) => {
    // Update the assignment with the new route
    const updatedAssignmentLogs = assignmentLogs.map(log => {
      if (log.trackingNo === selectedAssignment?.trackingNo) {
        return {
          ...log,
          optimizedRoute: route,
          originalRoute: {
            distance: route.distance * 1.2,
            duration: route.duration * 1.2,
            fuelCost: route.fuelCost * 1.2,
          }
        };
      }
      return log;
    });

    setAssignmentLogs(updatedAssignmentLogs);
    setShowRouteOptimizer(false);
    
    toast({
      title: "Route Optimized",
      content: `New route selected with ${((route.distance * 1.2 - route.distance) / (route.distance * 1.2) * 100).toFixed(1)}% distance reduction`,
    });
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Courier Assignments</h2>
          <p className="text-muted-foreground">
            Manage and track courier assignments
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Courier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Courier</DialogTitle>
                <DialogDescription>
                  Add a new courier to your delivery fleet
                </DialogDescription>
              </DialogHeader>
              <CourierForm onSubmit={handleAddCourier} isLoading={isLoading} />
            </DialogContent>
          </Dialog>

          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <Package className="w-4 h-4 mr-2" />
                Assign Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Delivery</DialogTitle>
                <DialogDescription>
                  Create a new delivery assignment
                </DialogDescription>
              </DialogHeader>
              
              {/* Improved Assignment Form */}
              <div className="grid gap-6 py-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="courier">Select Courier</Label>
                    <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a courier" />
                      </SelectTrigger>
                      <SelectContent>
                        {couriers.map((courier) => (
                          <SelectItem key={courier.id} value={courier.id}>
                            {courier.name} - {courier.vehicle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="source">Source Warehouse</Label>
                    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockWarehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Delivery Type</Label>
                    <RadioGroup value={deliveryType} onValueChange={setDeliveryType}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="warehouse" id="warehouse" />
                          <Label htmlFor="warehouse">Warehouse Transfer</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="client" id="client" />
                          <Label htmlFor="client">Client Delivery</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {deliveryType === 'warehouse' ? (
                    <div>
                      <Label htmlFor="destination">Destination Warehouse</Label>
                      <Select value={destinationWarehouse} onValueChange={setDestinationWarehouse}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockWarehouses
                            .filter(w => w.id !== selectedWarehouse)
                            .map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="address">Client Address</Label>
                      <Input
                        id="address"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder="Enter delivery address"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Select Products</Label>
                    <div className="grid gap-3 mt-2 max-h-[200px] overflow-y-auto rounded-md border p-4">
                      {FIXED_PRODUCTS.map((product) => (
                        <div key={product.id} className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-sm text-muted-foreground">
                              Stock: {product.quantity}
                            </span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={product.quantity}
                            value={selectedProducts[product.id] || ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setSelectedProducts({
                                ...selectedProducts,
                                [product.id]: Math.min(value, product.quantity),
                              });
                            }}
                            className="w-24"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleAssignCourier} 
                  disabled={isLoading}
                  className="w-full mt-4"
                >
                  {isLoading ? <LoadingSpinner /> : 'Assign Courier'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assignment Logs Section */}
      {assignmentLogs.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Delivery Assignments</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track and optimize your delivery assignments
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking No</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Route Details</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Route Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignmentLogs.map((log) => (
                <TableRow key={log.trackingNo}>
                  <TableCell className="font-medium">{log.trackingNo}</TableCell>
                  <TableCell>{log.courier}</TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm font-medium">From:</div>
                        <div className="text-sm text-muted-foreground">{log.from}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">To:</div>
                        <div className="text-sm text-muted-foreground">{log.to}</div>
                      </div>
                      {log.optimizedRoute && (
                        <div className="mt-2 space-y-2 border-t pt-2">
                          <div className="text-sm font-medium text-green-600">
                            Optimized Route Details:
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Distance:</span>{' '}
                              <span className="font-medium">{log.optimizedRoute.distance.toFixed(1)} km</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Original:</span>{' '}
                              {/* @ts-expect-error jk kj */}
                              <span className="font-medium">{log.originalRoute.distance.toFixed(1)} km</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Duration:</span>{' '}
                              <span className="font-medium">{(log.optimizedRoute.duration / 60).toFixed(1)}h</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Original:</span>{' '}
                              {/* @ts-expect-error jk kj */}
                              <span className="font-medium">{(log.originalRoute.duration / 60).toFixed(1)}h</span>
                            </div>
                            <div className="text-sm col-span-2 text-green-600 font-medium">
                              {/* @ts-expect-error jk kj */}
                              Savings: £{(log.originalRoute.fuelCost - log.optimizedRoute.fuelCost).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {/* @ts-expect-error jk j */}
                      {log.products?.map((product:any, index:any) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-muted-foreground"> × {product.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.optimizedRoute ? "success" : "default"}>
                      {log.optimizedRoute ? "Optimized" : "Standard"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog open={showRouteOptimizer} onOpenChange={setShowRouteOptimizer}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          {log.optimizedRoute ? "Re-optimize" : "Optimize Route"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Route Optimization</DialogTitle>
                          <DialogDescription>
                            Find the most efficient route for your delivery
                          </DialogDescription>
                        </DialogHeader>
                        <RouteOptimizer
                          currentRoute={[
                            {
                              id: 'start',
                              name: log.from,
                              coordinates: getCoordinatesForLocation(log.from),
                              type: 'start'
                            },
                            {
                              id: 'end',
                              name: log.to,
                              coordinates: getCoordinatesForLocation(log.to),
                              type: 'destination'
                            }
                          ]}
                          onRouteSelect={(route) => {
                            setAssignmentLogs(logs => 
                              logs.map(l => 
                                l.trackingNo === log.trackingNo
                                  ? {
                                      ...l,
                                      optimizedRoute: route,
                                      originalRoute: {
                                        distance: route.distance * 1.2,
                                        duration: route.duration * 1.2,
                                        fuelCost: route.fuelCost * 1.2
                                      }
                                    }
                                  : l
                              )
                            );
                            setShowRouteOptimizer(false);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Map Section - Moved below assignments */}
      <div className="h-[400px] rounded-lg border bg-card">
        <CourierMap locations={couriers.map(courier => ({
          name: courier.name,
          coordinates: getCoordinatesForLocation(courier.currentLocation),
          status: courier.status,
          destination: courier.destination ? getCoordinatesForLocation(courier.destination) : null
        }))} />
      </div>

      {/* Couriers List */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Courier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Vehicle</TableHead>
              <TableHead className="hidden md:table-cell">Current Location</TableHead>
              <TableHead className="hidden md:table-cell">Destination</TableHead>
              <TableHead className="hidden md:table-cell">ETA</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {couriers.map((courier) => (
              <TableRow key={courier.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{courier.name}</span>
                    <span className="text-sm text-muted-foreground md:hidden">
                      {courier.vehicle}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(courier.status)}</TableCell>
                <TableCell className="hidden md:table-cell">{courier.vehicle}</TableCell>
                <TableCell className="hidden md:table-cell">{courier.currentLocation}</TableCell>
                <TableCell className="hidden md:table-cell">{courier.destination || 'N/A'}</TableCell>
                {/* @ts-expect-error jk k */}
                <TableCell className="hidden md:table-cell">{formatETA(courier.eta)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedCourier(courier)}>
                      <MapPin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingCourier(courier)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeletingCourierId(courier.id)}
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
    </div>
  );
}

// Add this helper function in your component
function getCoordinatesForLocation(location: string): [number, number] {
  const coordinates: { [key: string]: [number, number] } = {
    'London, UK': [51.5074, -0.1278],
    'Manchester, UK': [53.4808, -2.2426],
    'Birmingham, UK': [52.4862, -1.8904],
    'Leeds, UK': [53.8008, -1.5491],
    'Glasgow, UK': [55.8642, -4.2518],
    'Cardiff, UK': [51.4816, -3.1791],
    'Edinburgh, UK': [55.9533, -3.1883],
    'Bristol, UK': [51.4545, -2.5879],
  };
  return coordinates[location] || [51.5074, -0.1278]; // Default to London if location not found
}