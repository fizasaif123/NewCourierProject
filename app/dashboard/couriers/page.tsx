'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Map } from 'lucide-react';
import Barcode from 'react-barcode';

interface Courier {
  id: string;
  // Personal Information
  name: string;
  email: string;
  phone: string;
  // Vehicle Information
  vehicle_type: string;
  vehicle_registration: string;
  max_capacity: number;
  // Zone Information
  assigned_region: string;
  default_zone: string;
  // Performance
  status: 'active' | 'inactive' | 'delayed';
  deliveries_completed: number;
  created_at: string;
  client_id: string;
}

interface DeliveryStop {
  id: string;
  delivery_id: string;
  address: string;
  stop_type: 'pickup' | 'delivery';
  sequence: number;
  status: 'pending' | 'completed';
  estimated_time: string;
}

interface ShippingLabel {
  packageId: string;
  products: Array<{
    name: string;
    quantity: number;
    dimensions?: string;
    weight?: number;
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

interface Delivery {
  id: string;
  courier_id: string;
  package_id: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  client_id: string;
  products: Array<{ name: string; quantity: number; dimensions?: string; weight?: number }>;
  delivery_stops?: DeliveryStop[];
  courier?: {
    name: string;
    vehicle_type: string;
    phone: string;
  };
  optimized_route?: any;
  shipping_label?: ShippingLabel;
  pod_file?: string;
  all_stops_completed?: boolean;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  client_id: string;
}

interface Product {
  product_id: string;
  name: string;
  quantity: number;
  dimensions?: string;
  weight?: number;
  sku?: string;
  category?: string;
}

interface RouteOption {
  id: number;
  name: string;
  description: string;
  distance: number;
  duration: number;
  fuelConsumption: number;
  stops: Array<{
    name: string;
    distance: number;
    duration: number;
    traffic: 'Low' | 'Medium' | 'High';
    weather: string;
  }>;
  totalFuelCost: number;
  roadType: string;
  advantages: string[];
  disadvantages: string[];
}

interface GoogleRouteResponse {
  distance: number;
  duration: number;
  steps: Array<{
    distance: number;
    duration: number;
    instructions: string;
    path: Array<{ lat: number; lng: number }>;
  }>;
}

interface Route {
  id: string;
  destination: string;
  notes?: string;
  priority: string;
  status: string;
}

// Create the Supabase client with service role key
const supabaseUrl = "https://qpkaklmbiwitlroykjim.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa2FrbG1iaXdpdGxyb3lramltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgxMzg2MiwiZXhwIjoyMDUyMzg5ODYyfQ.IBTdBXb3hjobEUDeMGRNbRKZoavL0Bvgpyoxb1HHr34";

const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

const RouteOptionCard = ({ option, selectedRoute }: { option: RouteOption; selectedRoute: RouteOption | null }) => (
  <div
    className={`flex items-center justify-between p-4 border rounded-lg ${
      selectedRoute?.id === option.id ? 'border-blue-500' : ''
    }`}
  >
    <div>
      <h4 className="font-semibold">{option.name}</h4>
      <p className="text-sm text-gray-600">{option.description}</p>
    </div>
    <Badge variant={option.id === 1 ? "success" : "secondary"}>
      {option.id === 1 ? "Recommended" : "Alternative"}
    </Badge>
  </div>
);

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isDeliveriesLoading, setIsDeliveriesLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [formData, setFormData] = useState({
    // Personal Information
    name: '',
    email: '',
    password: '',
    phone: '',
    // Vehicle Information
    vehicle_type: '',
    vehicle_registration: '',
    max_capacity: '',
    // Zone Information
    assigned_region: '',
    default_zone: '',
  });
  const [showAssignDeliveryDialog, setShowAssignDeliveryDialog] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [deliveryType, setDeliveryType] = useState<'warehouse' | 'client'>('warehouse');
  const [deliveryFormData, setDeliveryFormData] = useState({
    package_id: '',
    priority: 'medium',
    source_warehouse_id: '',
    destination_warehouse_id: '',
    client_address: '',
    pickup_time: '',
    notes: '',
    products: [{ name: '', quantity: 0 }]
  });
  const [deliveryStep, setDeliveryStep] = useState(1);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastDeliveryDetails, setLastDeliveryDetails] = useState<Delivery | null>(null);
  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ product_id: string, name: string, quantity: number, dimensions?: string, weight?: number }>>([]);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      toast.error('Please sign in to view couriers');
      return;
    }

    try {
      const userData = JSON.parse(currentUser);
      await Promise.all([
        fetchCouriers(userData.id),
        fetchWarehouses(userData.id),
        fetchDeliveries(userData.id)
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const fetchCouriers = async (clientId: string) => {
    try {
      setIsTableLoading(true);
      const { data, error } = await supabaseClient
        .from('couriers')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error('Error fetching couriers:', error);
      toast.error('Failed to fetch couriers');
    } finally {
      setIsTableLoading(false);
    }
  };

  const fetchWarehouses = async (clientId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('warehouses')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error('Failed to fetch warehouses');
    }
  };

  const fetchDeliveries = async (clientId: string) => {
    try {
      setIsDeliveriesLoading(true);
      const { data, error } = await supabaseClient
        .from('deliveries')
        .select(`
          *,
          courier:courier_id (
            name,
            vehicle_type,
            phone
          ),
          delivery_stops (
            address,
            stop_type
          ),
          shipping_label,
          optimized_route
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast.error('Failed to fetch deliveries');
    } finally {
      setIsDeliveriesLoading(false);
    }
  };

  const fetchWarehouseProducts = async (warehouseId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('warehouse_inventory')
        .select(`
          *,
          products:product_id (
            id,
            name,
            sku,
            category,
            dimensions,
            weight,
            client_id
          )
        `)
        .eq('warehouse_id', warehouseId);

      if (error) throw error;

      // Transform the data to match our Product interface
      const transformedProducts = (data || []).map(item => ({
        product_id: item.product_id,
        name: item.products.name,
        quantity: item.quantity,
        dimensions: item.products.dimensions,
        weight: item.products.weight,
        sku: item.products.sku,
        category: item.products.category
      }));

      setWarehouseProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching warehouse products:', error);
      toast.error('Failed to fetch warehouse products');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      vehicle_type: '',
      vehicle_registration: '',
      max_capacity: '',
      assigned_region: '',
      default_zone: '',
    });
  };

  const handleDialogChange = (open: boolean) => {
    setShowAddDialog(open);
    if (!open) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      toast.error('Please sign in to add couriers');
      setIsLoading(false);
      return;
    }

    try {
      const userData = JSON.parse(currentUser);

      // Validate password
      if (!formData.password || formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }

      // Check if courier email matches client email
      if (formData.email.toLowerCase() === userData.email.toLowerCase()) {
        toast.error("Courier's email cannot be the same as your email");
        setIsLoading(false);
        return;
      }

      // Check if courier email already exists
      const { data: existingCourier, error: checkError } = await supabaseClient
        .from('couriers')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingCourier) {
        toast.error('A courier with this email already exists');
        setIsLoading(false);
        return;
      }

      const { data: courierData, error: courierError } = await supabaseClient
        .from('couriers')
        .insert({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          vehicle_type: formData.vehicle_type,
          vehicle_registration: formData.vehicle_registration,
          max_capacity: parseInt(formData.max_capacity),
          assigned_region: formData.assigned_region,
          default_zone: formData.default_zone,
          status: 'active',
          deliveries_completed: 0,
          client_id: userData.id
        })
        .select()
        .single();

      if (courierError) {
        if (courierError.message.includes('password')) {
          toast.error('Failed to set courier password. Please ensure the password column exists in the database.');
          console.error('Database error:', courierError);
          return;
        }
        throw courierError;
      }

      toast.success('Courier added successfully');
      toast.success(`Courier can sign in with email: ${formData.email} and password: ${formData.password}`);
      setShowAddDialog(false);
      resetForm();
      fetchCouriers(userData.id);
    } catch (error: any) {
      console.error('Error adding courier:', error);
      toast.error(error.message || 'Failed to add courier');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate route optimization
      if (!selectedRoute) {
        toast.error('Please optimize and select a route before assigning delivery');
        setIsLoading(false);
        return;
      }

      // Get the selected courier and warehouse
      const selectedCourierData = couriers.find(c => c.id === selectedCourier);
      const selectedWarehouse = warehouses.find(w => w.id === deliveryFormData.source_warehouse_id);

      if (!selectedCourierData || !selectedWarehouse) {
        throw new Error('Selected courier or warehouse not found');
      }

      // Generate a unique package ID
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const packageId = `PKG-${timestamp}-${random}`;

      // Calculate total weight and format dimensions
      const productsWithDetails = selectedProducts.map(product => ({
        name: product.name,
        quantity: product.quantity,
        dimensions: product.dimensions || 'Not specified',
        weight: product.weight || 0
      }));

      const totalWeight = productsWithDetails.reduce((sum, product) => 
        sum + (product.weight || 0) * product.quantity, 0);

      // Generate shipping label for all deliveries
      const shippingLabel: ShippingLabel = {
        packageId,
        products: productsWithDetails,
        pickup: {
          location: selectedWarehouse.location,
          time: deliveryFormData.pickup_time
        },
        delivery: {
          address: deliveryType === 'warehouse' 
            ? warehouses.find(w => w.id === deliveryFormData.destination_warehouse_id)?.location || ''
            : deliveryFormData.client_address,
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

      // Prepare the optimized route data
      const optimizedRoute = {
        name: selectedRoute.name,
        description: selectedRoute.description,
        distance: selectedRoute.distance,
        duration: selectedRoute.duration,
        fuelConsumption: selectedRoute.fuelConsumption,
        totalFuelCost: selectedRoute.totalFuelCost,
        stops: selectedRoute.stops,
        advantages: selectedRoute.advantages,
        roadType: selectedRoute.roadType
      };

      // Create delivery payload
      const deliveryPayload = {
        courier_id: selectedCourier,
        package_id: packageId,
        priority: deliveryFormData.priority,
        status: 'pending',
        client_id: selectedCourierData.client_id,
        notes: deliveryFormData.notes || '',
        delivery_type: deliveryType,
        products: productsWithDetails,
        shipping_label: shippingLabel,
        optimized_route: optimizedRoute,
        created_at: new Date().toISOString()
      };

      // Create the delivery record
      const { data: deliveryData, error: deliveryError } = await supabaseClient
        .from('deliveries')
        .insert([deliveryPayload])
        .select(`
          *,
          courier:courier_id (
            name,
            vehicle_type,
            phone
          )
        `)
        .single();

      if (deliveryError) {
        console.error('Delivery Creation Error:', deliveryError);
        throw new Error(`Failed to create delivery: ${deliveryError.message}`);
      }

      // Prepare stops data
      const stops = [
        {
          delivery_id: deliveryData.id,
          warehouse_id: deliveryFormData.source_warehouse_id,
          address: selectedWarehouse.location,
          stop_type: 'pickup' as const,
          sequence: 1,
          status: 'pending' as const,
          estimated_time: deliveryFormData.pickup_time
        },
        {
          delivery_id: deliveryData.id,
          warehouse_id: deliveryType === 'warehouse' ? deliveryFormData.destination_warehouse_id : null,
          address: deliveryType === 'warehouse' 
            ? warehouses.find(w => w.id === deliveryFormData.destination_warehouse_id)?.location 
            : deliveryFormData.client_address,
          stop_type: 'delivery' as const,
          sequence: 2,
          status: 'pending' as const,
          estimated_time: deliveryFormData.pickup_time
        }
      ];

      // Create the delivery stops
      const { data: stopsData, error: stopsError } = await supabaseClient
        .from('delivery_stops')
        .insert(stops)
        .select();

      if (stopsError) {
        console.error('Delivery Stops Creation Error:', stopsError);
        await supabaseClient
          .from('deliveries')
          .delete()
          .eq('id', deliveryData.id);
        throw new Error(`Failed to create delivery stops: ${stopsError.message}`);
      }

      // Update the local state with the new delivery
      const newDelivery = {
        ...deliveryData,
        delivery_stops: stops,
        shipping_label: shippingLabel,
        optimized_route: optimizedRoute
      };
      
      setDeliveries(prevDeliveries => [newDelivery, ...prevDeliveries]);
      setLastDeliveryDetails(deliveryData);
      setShowSuccessDialog(true);
      setShowAssignDeliveryDialog(false);
      resetDeliveryForm();

      // Update courier's delivery count
      const { error: courierUpdateError } = await supabaseClient
        .from('couriers')
        .update({
          deliveries_completed: selectedCourierData.deliveries_completed + 1
        })
        .eq('id', selectedCourier);

      if (courierUpdateError) {
        console.error('Error updating courier delivery count:', courierUpdateError);
      }

      // Update local state
      setCouriers(prevCouriers =>
        prevCouriers.map(courier =>
          courier.id === selectedCourier
            ? { ...courier, deliveries_completed: courier.deliveries_completed + 1 }
            : courier
        )
      );

      toast.success('Delivery assigned successfully');

    } catch (error: any) {
      console.error('Error in handleAssignDelivery:', error);
      toast.error(error.message || 'Failed to assign delivery');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDeliveryForm = () => {
    setDeliveryFormData({
      package_id: '',
      priority: 'medium',
      source_warehouse_id: '',
      destination_warehouse_id: '',
      client_address: '',
      pickup_time: '',
      notes: '',
      products: [{ name: '', quantity: 0 }]
    });
    setSelectedCourier('');
    setDeliveryType('warehouse');
    setDeliveryStep(1);
    setSelectedProducts([]);
    setSelectedRoute(null);
    setRouteOptions([]);
  };

  const handleSourceWarehouseChange = (warehouseId: string) => {
    setDeliveryFormData(prev => ({ ...prev, source_warehouse_id: warehouseId }));
    fetchWarehouseProducts(warehouseId);
    setSelectedProducts([]);
  };

  const calculateRouteOptions = async (pickup: string, delivery: string) => {
    setIsCalculatingRoute(true);
    setMapError(null);
    
    try {
      // First, geocode the addresses using Nominatim
      const pickupResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickup)}`);
      const deliveryResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(delivery)}`);
      
      const pickupData = await pickupResponse.json();
      const deliveryData = await deliveryResponse.json();

      if (!pickupData[0] || !deliveryData[0]) {
        throw new Error('Could not find coordinates for one or both locations');
      }

      // Get coordinates
      const pickupCoords = `${pickupData[0].lon},${pickupData[0].lat}`;
      const deliveryCoords = `${deliveryData[0].lon},${deliveryData[0].lat}`;

      // Get routes using OSRM
      const mainRouteResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickupCoords};${deliveryCoords}?overview=full&alternatives=true&steps=true`
      );
      const mainRouteData = await mainRouteResponse.json();

      if (mainRouteData.code !== 'Ok' || !mainRouteData.routes.length) {
        throw new Error('Could not calculate route');
      }

      // Transform OSRM results into our RouteOption format
      const options: RouteOption[] = mainRouteData.routes.slice(0, 2).map((route: { distance: number; duration: number; legs: any[] }, index: number) => {
        const distanceInKm = route.distance / 1000;
        const durationInMinutes = route.duration / 60;
        const fuelConsumption = (distanceInKm * 10) / 100; // Assuming 10L/100km
        const fuelCost = fuelConsumption * 250; // PKR 250 per liter

        // Filter and process steps to get meaningful stops
        const allSteps = route.legs[0].steps;
        const significantSteps = allSteps.filter((step: any, i: number) => {
          // Keep steps that are major turns or have significant distance
          const isSignificantDistance = step.distance > 5000; // More than 5km
          const isImportantManeuver = step.maneuver?.type === 'turn' || 
                                    step.maneuver?.type === 'merge' ||
                                    step.maneuver?.type === 'motorway';
          const isEveryFifthStep = i % 5 === 0; // Take every 5th step for long routes
          return isSignificantDistance || isImportantManeuver || isEveryFifthStep;
        });

        // Limit to maximum 5 intermediate stops
        const limitedSteps = significantSteps.slice(0, 5);

        // Calculate cumulative distances and durations
        let cumulativeDistance = 0;
        let cumulativeDuration = 0;

        const stops = [
          {
            name: pickupData[0].display_name.split(',')[0],
            distance: 0,
            duration: 0,
            traffic: 'Low',
            weather: 'Clear'
          },
          ...limitedSteps.map((step: any) => {
            cumulativeDistance += step.distance / 1000;
            cumulativeDuration += step.duration / 60;
            
            // Get a meaningful name for the stop
            const locationName = step.name || 
              (step.maneuver?.location ? `Major Junction at ${step.maneuver.location[1].toFixed(3)}°N, ${step.maneuver.location[0].toFixed(3)}°E` : 
              'Major Waypoint');

            return {
              name: locationName,
              distance: cumulativeDistance,
              duration: cumulativeDuration,
              traffic: Math.random() > 0.7 ? 'Medium' : 'Low', // Randomize traffic for variety
              weather: 'Clear'
            };
          }),
          {
            name: deliveryData[0].display_name.split(',')[0],
            distance: distanceInKm,
            duration: durationInMinutes,
            traffic: 'Low',
            weather: 'Clear'
          }
        ];

        return {
          id: index + 1,
          name: index === 0 ? "Primary Route" : "Alternative Route",
          description: index === 0 ? 
            "Recommended route based on distance and time" : 
            "Alternative route with different path",
          distance: distanceInKm,
          duration: durationInMinutes,
          fuelConsumption,
          stops,
          totalFuelCost: fuelCost,
          roadType: index === 0 ? "Primary roads" : "Secondary roads",
          advantages: index === 0 ?
            ["Shortest distance", "Optimal path", "Main roads"] :
            ["Alternative path", "Less traffic", "Backup option"],
          disadvantages: index === 0 ?
            ["May have tolls", "Peak hour traffic", "Popular route"] :
            ["Longer distance", "More turns", "Secondary roads"]
        };
      });

      setRouteOptions(options);
    } catch (error) {
      console.error('Error calculating routes:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to calculate routes');
      toast.error('Failed to calculate route options');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleOptimizeRoute = async (delivery: Delivery) => {
    const pickup = delivery.delivery_stops?.find(stop => stop.stop_type === 'pickup')?.address || '';
    const deliveryAddress = delivery.delivery_stops?.find(stop => stop.stop_type === 'delivery')?.address || '';

    if (!pickup || !deliveryAddress) {
      toast.error('Missing pickup or delivery address');
      return;
    }

    setSelectedDelivery(delivery);
    setShowRouteDialog(true);
    calculateRouteOptions(pickup, deliveryAddress);
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    toast.success(`Selected route: ${route.name}`);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!selectedCourier || !deliveryType) {
          toast.error('Please select a courier and delivery type');
          return false;
        }
        return true;

      case 2:
        if (!deliveryFormData.source_warehouse_id) {
          toast.error('Please select a source warehouse');
          return false;
        }
        if (deliveryType === 'warehouse' && !deliveryFormData.destination_warehouse_id) {
          toast.error('Please select a destination warehouse');
          return false;
        }
        if (deliveryType === 'client' && !deliveryFormData.client_address) {
          toast.error('Please enter a client delivery address');
          return false;
        }
        return true;

      case 3:
        if (selectedProducts.length === 0) {
          toast.error('Please select at least one product');
          return false;
        }
        return true;

      case 4:
        if (!selectedRoute) {
          toast.error('Please calculate and select a route');
          return false;
        }
        return true;

      case 5:
        if (!deliveryFormData.pickup_time) {
          toast.error('Please select a pickup time');
          return false;
        }
        if (!deliveryFormData.priority) {
          toast.error('Please select a priority level');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handlePodUpload = async (deliveryId: string, file: File) => {
    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${deliveryId}-pod.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('pod_files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('pod_files')
        .getPublicUrl(fileName);

      // Update delivery record with POD file URL
      const { error: updateError } = await supabaseClient
        .from('deliveries')
        .update({ 
          pod_file: publicUrl,
          status: 'completed'
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      // Update local state
      setDeliveries(prevDeliveries =>
        prevDeliveries.map(delivery =>
          delivery.id === deliveryId
            ? { ...delivery, pod_file: publicUrl, status: 'completed' }
            : delivery
        )
      );

      toast.success('POD uploaded and delivery marked as completed');
    } catch (error) {
      console.error('Error uploading POD:', error);
      toast.error('Failed to upload POD');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Courier Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Courier
          </Button>
          <Button onClick={() => setShowAssignDeliveryDialog(true)} variant="outline">
            Assign Delivery
          </Button>
        </div>
      </div>

      {/* Couriers Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deliveries</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isTableLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading couriers...
                </TableCell>
              </TableRow>
            ) : couriers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No couriers found. Add your first courier using the button above.
                </TableCell>
              </TableRow>
            ) : (
              couriers.map((courier) => (
                <TableRow key={courier.id}>
                  <TableCell>{courier.name}</TableCell>
                  <TableCell>{courier.email}</TableCell>
                  <TableCell>{courier.phone}</TableCell>
                  <TableCell>{courier.vehicle_type} ({courier.vehicle_registration})</TableCell>
                  <TableCell>{courier.assigned_region}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        courier.status === 'active' ? 'success' : 
                        courier.status === 'delayed' ? 'warning' : 'secondary'
                      }
                    >
                      {courier.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{courier.deliveries_completed}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Assigned Deliveries Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Assigned Deliveries</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package ID</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Shipping Label</TableHead>
                <TableHead>Route Details</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDeliveriesLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading deliveries...
                  </TableCell>
                </TableRow>
              ) : deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No deliveries found. Assign your first delivery using the button above.
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>{delivery.package_id}</TableCell>
                    <TableCell>
                      {delivery.courier?.name} ({delivery.courier?.vehicle_type})
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        delivery.priority === 'high' ? 'destructive' :
                        delivery.priority === 'medium' ? 'warning' : 'default'
                      }>
                        {delivery.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        delivery.status === 'completed' ? 'success' :
                        delivery.status === 'in_progress' ? 'warning' :
                        delivery.status === 'failed' ? 'destructive' : 'default'
                      }>
                        {delivery.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {delivery.delivery_stops?.find(stop => stop.stop_type === 'pickup')?.address}
                    </TableCell>
                    <TableCell>
                      {delivery.delivery_stops?.find(stop => stop.stop_type === 'delivery')?.address}
                    </TableCell>
                    <TableCell>
                      {delivery.shipping_label ? (
                        <div className="space-y-2">
                          <div className="flex flex-col gap-1">
                            <div className="text-sm">
                              <span className="font-medium">Products:</span> {delivery.products?.length || 0}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Total Weight:</span> {delivery.shipping_label.totalWeight}kg
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  View Label
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Shipping Label</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-4">
                                      <div>
                                        <h3 className="text-lg font-bold">Package Details</h3>
                                        <p className="text-sm text-gray-500">ID: {delivery.package_id}</p>
                                      </div>
                                      <Badge variant={
                                        delivery.priority === 'high' ? 'destructive' :
                                        delivery.priority === 'medium' ? 'warning' : 'default'
                                      }>
                                        {delivery.priority.toUpperCase()}
                                      </Badge>
                                    </div>

                                    <div className="flex justify-center mb-4">
                                      <Barcode 
                                        value={delivery.package_id}
                                        width={1.2}
                                        height={40}
                                        fontSize={12}
                                        margin={5}
                                        background="#ffffff"
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                      <div className="space-y-1">
                                        <h4 className="font-medium">Pickup Location</h4>
                                        <p className="text-gray-600">{delivery.delivery_stops?.find(stop => stop.stop_type === 'pickup')?.address}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="font-medium">Delivery Location</h4>
                                        <p className="text-gray-600">{delivery.delivery_stops?.find(stop => stop.stop_type === 'delivery')?.address}</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2 text-sm mb-4">
                                      <h4 className="font-medium">Courier Information</h4>
                                      <div className="grid grid-cols-3 gap-2">
                                        <p>{delivery.courier?.name}</p>
                                        <p className="text-gray-600">Vehicle: {delivery.courier?.vehicle_type}</p>
                                        <p className="text-gray-600">Phone: {delivery.courier?.phone}</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                      <h4 className="font-medium">Products</h4>
                                      <div className="grid gap-2">
                                        {delivery.products?.map((product, index) => (
                                          <div key={index} className="border rounded p-2 text-sm">
                                            <div className="flex justify-between">
                                              <p className="font-medium">{product.name}</p>
                                              <p>Qty: {product.quantity}</p>
                                            </div>
                                            <div className="text-xs text-gray-500 grid grid-cols-2 gap-1">
                                              <p>Dimensions: {product.dimensions || 'N/A'}</p>
                                              <p>Weight: {product.weight ? `${product.weight} kg` : 'N/A'}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm border-t pt-2">
                                      <div>
                                        <p className="text-gray-500">Total Items:</p>
                                        <p className="font-medium">
                                          {delivery.shipping_label?.products.reduce((sum, product) => sum + product.quantity, 0)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Total Weight:</p>
                                        <p className="font-medium">
                                          {delivery.shipping_label?.totalWeight} kg
                                        </p>
                                      </div>
                                    </div>

                                    <div className="border-t mt-4 pt-4">
                                      <h4 className="font-medium mb-2">Receiver's Signature</h4>
                                      <div className="border-b border-dashed border-gray-400 py-6">
                                        <p className="text-center text-gray-500 text-sm">Sign here</p>
                                      </div>
                                      <div className="flex justify-between text-sm text-gray-500 mt-2">
                                        <span>Date: _________________</span>
                                        <span>Time: _________________</span>
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center border-t mt-4 pt-4 text-sm">
                                      <div>
                                        <p>Created: {new Date(delivery.created_at).toLocaleString()}</p>
                                        <p className="text-gray-500">Status: {delivery.status}</p>
                                      </div>
                                      <Button onClick={() => window.print()} variant="outline" size="sm">
                                        Print Label
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {delivery.optimized_route ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-2 text-green-600 mb-2">
                            <Map className="h-4 w-4" />
                            <p className="font-medium">Route Stops:</p>
                          </div>
                          <div className="space-y-1.5">
                            {delivery.optimized_route.stops?.map((stop: any, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs 
                                  ${index === 0 ? 'bg-blue-100 text-blue-600' : 
                                    index === delivery.optimized_route.stops.length - 1 ? 'bg-green-100 text-green-600' : 
                                    'bg-gray-100 text-gray-600'}`}>
                                  {index + 1}
                                </div>
                                <div className="flex-1 text-gray-600">
                                  {stop.name}
                                  {index === 0 && <span className="text-blue-600 text-xs ml-1">(Start)</span>}
                                  {index === delivery.optimized_route.stops.length - 1 && <span className="text-green-600 text-xs ml-1">(End)</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Map className="h-4 w-4" />
                          <span>Not optimized</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(delivery.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {delivery.status !== 'completed' && (
                        <div className="flex gap-2">
                          {!delivery.optimized_route && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOptimizeRoute(delivery)}
                            >
                              <Map className="h-4 w-4 mr-2" />
                              Optimize Route
                            </Button>
                          )}
                          
                          {delivery.all_stops_completed && !delivery.pod_file && (
                            <div className="flex items-center">
                              <Label htmlFor={`pod-${delivery.id}`} className="cursor-pointer">
                                <Input
                                  id={`pod-${delivery.id}`}
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handlePodUpload(delivery.id, file);
                                    }
                                  }}
                                />
                                <Badge variant="outline" className="bg-yellow-50 hover:bg-yellow-100 cursor-pointer">
                                  Upload POD to Complete
                                </Badge>
                              </Label>
                            </div>
                          )}
                          
                          {!delivery.all_stops_completed && (
                            <Badge variant="outline" className="bg-gray-50">
                              Complete All Stops First
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {delivery.status === 'completed' && delivery.pod_file && (
                        <div className="flex items-center gap-2">
                          <Badge variant="success">Completed</Badge>
                          <a 
                            href={delivery.pod_file} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View POD
                          </a>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Courier Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Courier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="font-medium">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Information Section */}
            <div className="space-y-4">
              <h3 className="font-medium">Vehicle Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Vehicle Type</Label>
                  <Input
                    id="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_type: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_registration">Registration</Label>
                  <Input
                    id="vehicle_registration"
                    value={formData.vehicle_registration}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_registration: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Max Capacity (packages)</Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_capacity: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Zone Information Section */}
            <div className="space-y-4">
              <h3 className="font-medium">Zone Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assigned_region">Assigned Region</Label>
                  <Input
                    id="assigned_region"
                    value={formData.assigned_region}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_region: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_zone">Default Zone</Label>
                  <Input
                    id="default_zone"
                    value={formData.default_zone}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_zone: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleDialogChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Courier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Delivery Dialog */}
      <Dialog 
        open={showAssignDeliveryDialog} 
        onOpenChange={(open) => {
          if (!open) {
            resetDeliveryForm();
            setSelectedRoute(null);
          }
          setShowAssignDeliveryDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Delivery - Step {deliveryStep} of 5</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignDelivery} className="space-y-4">
            {/* Step 1: Delivery Type and Courier */}
            {deliveryStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Delivery Type</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value as 'warehouse' | 'client')}
                    required
                  >
                    <option value="warehouse">Warehouse to Warehouse</option>
                    <option value="client">Warehouse to Client Address</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Select Courier</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    required
                  >
                    <option value="">Select a courier</option>
                    {couriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.name} - {courier.vehicle_type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Location Details */}
            {deliveryStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Source Warehouse</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={deliveryFormData.source_warehouse_id}
                    onChange={(e) => handleSourceWarehouseChange(e.target.value)}
                    required
                  >
                    <option value="">Select source warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} - {warehouse.location}
                      </option>
                    ))}
                  </select>
                </div>

                {deliveryType === 'warehouse' ? (
                  <div className="space-y-2">
                    <Label>Destination Warehouse</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={deliveryFormData.destination_warehouse_id}
                      onChange={(e) => setDeliveryFormData(prev => ({ ...prev, destination_warehouse_id: e.target.value }))}
                      required
                    >
                      <option value="">Select destination warehouse</option>
                      {warehouses
                        .filter(w => w.id !== deliveryFormData.source_warehouse_id)
                        .map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} - {warehouse.location}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Client Delivery Address</Label>
                    <Input
                      value={deliveryFormData.client_address}
                      onChange={(e) => setDeliveryFormData(prev => ({ ...prev, client_address: e.target.value }))}
                      placeholder="Enter delivery address"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Products */}
            {deliveryStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Products from Warehouse</Label>
                  {warehouseProducts.length === 0 ? (
                    <p className="text-sm text-gray-500">No products available in selected warehouse</p>
                  ) : (
                    <div className="space-y-4">
                      {warehouseProducts.map((product) => (
                        <div key={product.product_id} className="flex items-center gap-4 p-2 border rounded-md">
                          <div className="flex-grow">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            <p className="text-sm text-gray-500">Available: {product.quantity}</p>
                            {product.category && (
                              <p className="text-sm text-gray-500">Category: {product.category}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-24"
                              placeholder="Qty"
                              min="1"
                              max={product.quantity}
                              value={selectedProducts.find(p => p.product_id === product.product_id)?.quantity || ''}
                              onChange={(e) => {
                                const quantity = parseInt(e.target.value);
                                if (quantity > 0 && quantity <= product.quantity) {
                                  const newSelectedProducts = selectedProducts.filter(p => p.product_id !== product.product_id);
                                  if (quantity > 0) {
                                    newSelectedProducts.push({
                                      product_id: product.product_id,
                                      name: product.name,
                                      quantity: quantity,
                                      dimensions: product.dimensions,
                                      weight: product.weight
                                    });
                                  }
                                  setSelectedProducts(newSelectedProducts);
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Route Optimization */}
            {deliveryStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Route Optimization</Label>
                  <div className="p-4 border rounded-md max-h-[400px] overflow-y-auto">
                    {isCalculatingRoute ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2" />
                        <p>Calculating optimal routes...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {routeOptions.length === 0 ? (
                          <Button
                            type="button"
                            onClick={() => {
                              const pickup = deliveryFormData.source_warehouse_id 
                                ? warehouses.find(w => w.id === deliveryFormData.source_warehouse_id)?.location 
                                : '';
                              const delivery = deliveryType === 'warehouse'
                                ? warehouses.find(w => w.id === deliveryFormData.destination_warehouse_id)?.location
                                : deliveryFormData.client_address;
                              
                              if (!pickup || !delivery) {
                                toast.error('Missing pickup or delivery location');
                                return;
                              }
                              
                              calculateRouteOptions(pickup, delivery);
                            }}
                            className="w-full"
                          >
                            Calculate Routes
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            {routeOptions.map((route, index) => (
                              <div 
                                key={index}
                                className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                                  selectedRoute?.id === route.id 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'hover:border-gray-400'
                                }`}
                                onClick={() => handleRouteSelect(route)}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <p className="font-medium">{route.name}</p>
                                    <p className="text-xs text-gray-600">{route.description}</p>
                                  </div>
                                  {route.id === 1 && (
                                    <Badge variant="success" className="text-xs">Recommended</Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-4 gap-2 text-xs mb-2 bg-gray-50 p-2 rounded">
                                  <div>
                                    <p className="text-gray-500">Distance</p>
                                    <p className="font-medium">{route.distance.toFixed(1)} km</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Duration</p>
                                    <p className="font-medium">{route.duration.toFixed(0)} min</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Fuel</p>
                                    <p className="font-medium">{route.fuelConsumption.toFixed(1)}L</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Cost</p>
                                    <p className="font-medium">₨{route.totalFuelCost.toFixed(0)}</p>
                                  </div>
                                </div>

                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Map className="h-3 w-3" />
                                    <p className="font-medium">Stops:</p>
                                  </div>
                                  <div className="space-y-1 ml-4">
                                    {route.stops.map((stop, stopIndex) => (
                                      <div key={stopIndex} className="flex items-center gap-1">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center 
                                          ${stopIndex === 0 ? 'bg-blue-100 text-blue-600' : 
                                            stopIndex === route.stops.length - 1 ? 'bg-green-100 text-green-600' : 
                                            'bg-gray-100 text-gray-600'}`}
                                        >
                                          {stopIndex + 1}
                                        </div>
                                        <div className="flex-1 truncate">
                                          {stop.name}
                                          {stopIndex === 0 && <span className="text-blue-600 ml-1">(Start)</span>}
                                          {stopIndex === route.stops.length - 1 && <span className="text-green-600 ml-1">(End)</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {route.advantages.length > 0 && (
                                  <div className="mt-2">
                                    <div className="flex gap-1 flex-wrap">
                                      {route.advantages.map((advantage, i) => (
                                        <Badge key={i} variant="outline" className="bg-green-50 text-xs py-0">
                                          {advantage}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setRouteOptions([]);
                                setSelectedRoute(null);
                              }}
                              className="w-full mt-2"
                            >
                              Recalculate Routes
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Delivery Details */}
            {deliveryStep === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={deliveryFormData.priority}
                    onChange={(e) => setDeliveryFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Pickup Time</Label>
                  <Input
                    type="datetime-local"
                    value={deliveryFormData.pickup_time}
                    onChange={(e) => setDeliveryFormData(prev => ({ ...prev, pickup_time: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <textarea
                    className="w-full p-2 border rounded-md"
                    value={deliveryFormData.notes}
                    onChange={(e) => setDeliveryFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    placeholder="Add any special instructions"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (deliveryStep === 1) {
                    setShowAssignDeliveryDialog(false);
                    resetDeliveryForm();
                  } else {
                    setDeliveryStep(prev => prev - 1);
                  }
                }}
              >
                {deliveryStep === 1 ? 'Cancel' : 'Back'}
              </Button>

              {deliveryStep < 5 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (validateStep(deliveryStep)) {
                      setDeliveryStep(prev => prev + 1);
                    }
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading || !validateStep(5)}>
                  {isLoading ? 'Assigning...' : 'Assign Delivery'}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delivery Assigned Successfully</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Delivery Details</h3>
              <p>Package ID: {lastDeliveryDetails?.package_id}</p>
              <p>Priority: {lastDeliveryDetails?.priority}</p>
              <p>Status: {lastDeliveryDetails?.status}</p>
            </div>
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

      {/* Route Optimization Dialog */}
      <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="sticky top-0 bg-white pb-4 z-10">
            <DialogTitle className="text-2xl">Route Optimization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isCalculatingRoute ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
                <p className="text-lg">Calculating optimal routes...</p>
              </div>
            ) : mapError ? (
              <div className="text-center py-8">
                <p className="text-red-600 text-lg mb-4">{mapError}</p>
                <Button
                  onClick={() => {
                    setMapError(null);
                    const pickup = selectedDelivery?.delivery_stops?.find(stop => stop.stop_type === 'pickup')?.address || '';
                    const delivery = selectedDelivery?.delivery_stops?.find(stop => stop.stop_type === 'delivery')?.address || '';
                    calculateRouteOptions(pickup, delivery);
                  }}
                  size="lg"
                >
                  Retry Calculation
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 p-4 rounded-lg shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Package ID</p>
                      <p className="font-medium">{selectedDelivery?.package_id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Priority</p>
                      <Badge variant={
                        selectedDelivery?.priority === 'high' ? 'destructive' :
                        selectedDelivery?.priority === 'medium' ? 'warning' : 'default'
                      }>
                        {selectedDelivery?.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {routeOptions.map((option: RouteOption) => (
                    <RouteOptionCard key={option.id} option={option} selectedRoute={selectedRoute} />
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowRouteDialog(false)}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 