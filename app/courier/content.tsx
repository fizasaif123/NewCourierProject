import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import {
  Package, Clock, Map as MapIcon, ArrowUpFromLine, ArrowDownToLine, CheckCircle, AlertCircle, Truck, Box, Navigation, Timer, ClipboardList
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React from 'react';
import Barcode from 'react-barcode';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Initialize Supabase client
const supabaseUrl = "https://qpkaklmbiwitlroykjim.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa2FrbG1iaXdpdGxyb3lramltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgxMzg2MiwiZXhwIjoyMDUyMzg5ODYyfQ.IBTdBXb3hjobEUDeMGRNbRKZoavL0Bvgpyoxb1HHr34";
const supabase = createClient(supabaseUrl, supabaseKey);

interface DeliveryStop {
  id?: string;
  delivery_id?: string;
  address: string;
  stop_type: 'pickup' | 'delivery';
  status: 'pending' | 'completed';
  sequence: number;
  actual_arrival_time?: string;
  estimated_time?: string;
  route_info?: {
    distance: number;
    duration: number;
    traffic: string;
    weather: string;
  };
  latitude: number;
  longitude: number;
}

interface FailureReason {
  reason: string;
  details: string;
}

interface Delivery {
  id: string;
  package_id: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  notes?: string;
  delivery_stops?: DeliveryStop[];
  optimized_route?: {
    name: string;
    distance: number;
    duration: number;
    stops: Array<{
      name: string;
      distance: number;
      duration: number;
      traffic: string;
      weather: string;
    }>;
    totalFuelCost?: number;
  };
  products: Array<{ name: string; quantity: number }>;
  failure_details?: {
    reason_code: string;
    description: string;
    failed_at: string;
  };
  pod_file?: string;
}

// Fix for default marker icons in react-leaflet
const defaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Add DeliveryMap component
const DeliveryMap = ({ stops }:any) => {
  if (!stops || stops.length === 0) return null;

  // Filter out stops with invalid coordinates and validate coordinates
  const validStops = stops.filter((stop:any) => 
    typeof stop.latitude === 'number' && 
    typeof stop.longitude === 'number' &&
    !isNaN(stop.latitude) && 
    !isNaN(stop.longitude) &&
    stop.latitude >= -90 && 
    stop.latitude <= 90 &&
    stop.longitude >= -180 && 
    stop.longitude <= 180
  );

  if (validStops.length === 0) {
    return (
      <div className="h-[400px] w-full rounded-lg overflow-hidden border flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">No valid coordinates available for this route</p>
      </div>
    );
  }

  // Calculate center position from first valid stop
  const center = [validStops[0].latitude, validStops[0].longitude];
  
  // Create array of positions for the polyline from valid stops
  const positions = validStops.map((stop:any) => [stop.latitude, stop.longitude]);

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border">
      <MapContainer 
      // @ts-expect-error jjk
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {validStops.map((stop:any, index:any) => (
          <Marker 
            key={stop.id || index} 
            position={[stop.latitude, stop.longitude]}
          >
            <Popup>
              <div className="font-semibold">Stop {index + 1}</div>
              <div>{stop.address}</div>
              {stop.status === 'completed' && (
                <div className="text-green-600">Completed</div>
              )}
            </Popup>
          </Marker>
        ))}
        {positions.length > 1 && (
          <Polyline 
            positions={positions}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
};

// Add ShippingLabelDisplay component
const ShippingLabelDisplay = ({ delivery }:any) => {
  const labelRef = React.useRef(null);

  const handleDownload = async (format:any) => {
    if (!labelRef.current) return;

    try {
      if (format === 'png') {
        const canvas = await html2canvas(labelRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `shipping-label-${delivery.package_id}.png`;
        link.href = dataUrl;
        link.click();
      } else if (format === 'pdf') {
        const canvas = await html2canvas(labelRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`shipping-label-${delivery.package_id}.pdf`);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleDownload('png')}
        >
          Download as PNG
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleDownload('pdf')}
        >
          Download as PDF
        </Button>
      </div>

      <div ref={labelRef} className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-start">
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

        <div className="mt-4 flex justify-center">
          <Barcode 
            value={delivery.package_id}
            width={1.5}
            height={50}
            fontSize={14}
            margin={10}
            background="#ffffff"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="font-medium">Pickup Location</h4>
            <p className="text-sm">{delivery.delivery_stops?.find((stop:any) => stop.stop_type === 'pickup')?.address}</p>
          </div>
          <div>
            <h4 className="font-medium">Delivery Location</h4>
            <p className="text-sm">{delivery.delivery_stops?.find((stop:any) => stop.stop_type === 'delivery')?.address}</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium">Products</h4>
          <div className="space-y-2">
            {delivery.products?.map((product:any, index:any) => (
              <div key={index} className="border rounded p-2">
                <p className="font-medium">{product.name}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Quantity: {product.quantity}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <p>Dimensions: {product.dimensions || 'Not specified'}</p>
                    <p>Weight: {product.weight ? `${product.weight} kg` : 'Not specified'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <h4 className="font-medium">Receiver's Signature</h4>
          <div className="mt-2 border-b border-dashed border-gray-400 py-8">
            <p className="text-center text-gray-500 text-sm">Sign here</p>
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-500">
            <span>Date: _________________</span>
            <span>Time: _________________</span>
          </div>
        </div>

        <div className="flex justify-between items-center border-t mt-4 pt-4">
          <div>
            <p className="text-sm">Created: {new Date(delivery.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CourierDashboardContent() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courierData, setCourierData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    failedDeliveries: 0,
    totalDistance: 0,
    lastDeliveryTime: null
  });
  const [failureDialogOpen, setFailureDialogOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<FailureReason>({
    reason: '',
    details: ''
  });

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const currentCourier = localStorage.getItem('currentCourier');
    if (!currentCourier) {
      toast.error('Please sign in to view your deliveries');
      router.push('/auth/login');
      return;
    }

    try {
      const courierInfo = JSON.parse(currentCourier);
      setCourierData(courierInfo);
      await fetchCourierDeliveries(courierInfo.id);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const fetchCourierDeliveries = async (courierId: string) => {
    try {
      setIsLoading(true);
      console.log('Fetching deliveries for courier:', courierId);
      
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select(`
          *,
          optimized_route,
          delivery_stops (*)
        `)
        .eq('courier_id', courierId)
        .order('created_at', { ascending: false });

      if (deliveriesError) {
        console.error('Error fetching deliveries:', deliveriesError);
        throw deliveriesError;
      }

      // Process each delivery
      const deliveriesWithStops = (deliveriesData || []).map((delivery) => {
        const routeInfo = delivery.optimized_route || {};
        console.log('Route info for delivery:', delivery.id, routeInfo);

        // Create stops from the optimized route stops
        const deliveryStops = routeInfo.stops?.map((stop:any, index:any, stops:any) => {
          // Calculate the actual distance and duration from previous stop
          const prevStop = index > 0 ? stops[index - 1] : null;
          const distanceFromPrev = prevStop 
            ? (stop.distance - prevStop.distance)
            : stop.distance;
          const durationFromPrev = prevStop
            ? (stop.duration - prevStop.duration)
            : stop.duration;

          // Extract or generate coordinates
          // For testing, you can use these sample coordinates for Bangalore
          // In production, these should come from your actual data
          const sampleCoordinates = [
            { lat: 12.9716, lng: 77.5946 }, // Bangalore City Center
            { lat: 13.0168, lng: 77.5681 }, // Malleshwaram
            { lat: 12.9351, lng: 77.6244 }, // Koramangala
            { lat: 12.9782, lng: 77.6408 }  // Indiranagar
          ];

          // Use actual coordinates from stop data if available, otherwise use sample data
          const latitude = stop.latitude || sampleCoordinates[index % sampleCoordinates.length].lat;
          const longitude = stop.longitude || sampleCoordinates[index % sampleCoordinates.length].lng;

          return {
            id: `route-${delivery.id}-${index}`,
            address: stop.name,
            stop_type: index === 0 ? 'pickup' : 'delivery',
            status: 'pending',
            sequence: index,
            latitude: latitude,
            longitude: longitude,
            route_info: {
              name: stop.name,
              distance: stop.distance,
              duration: stop.duration,
              distanceFromPrevious: distanceFromPrev,
              durationFromPrevious: durationFromPrev,
              traffic: stop.traffic,
              weather: stop.weather
            }
          };
        }) || [];

        return {
          ...delivery,
          delivery_stops: deliveryStops,
          optimized_route: {
            name: routeInfo.name || 'Primary Route',
            distance: Number(routeInfo.distance) || 0,
            duration: Number(routeInfo.duration) || 0,
            stops: routeInfo.stops || [],
            totalFuelCost: routeInfo.totalFuelCost
          }
        };
      });

      console.log('Processed deliveries with stops:', deliveriesWithStops);
      setDeliveries(deliveriesWithStops);

      // Calculate statistics
      const stats = {
        totalDeliveries: deliveriesWithStops.length,
        completedDeliveries: deliveriesWithStops.filter(d => d.status === 'completed').length,
        pendingDeliveries: deliveriesWithStops.filter(d => d.status === 'pending').length,
        failedDeliveries: deliveriesWithStops.filter(d => d.status === 'failed').length,
        totalDistance: deliveriesWithStops.reduce((acc, d) => acc + (d.optimized_route?.distance || 0), 0),
        lastDeliveryTime: deliveriesWithStops[0]?.created_at || null
      };
      setStats(stats);
    } catch (error) {
      console.error('Error in fetchCourierDeliveries:', error);
      toast.error('Failed to fetch deliveries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (deliveryId: string, newStatus: 'in_progress' | 'completed' | 'failed') => {
    try {
      if (newStatus === 'failed') {
        setSelectedDeliveryId(deliveryId);
        setFailureDialogOpen(true);
        return;
      }

      if (newStatus === 'completed') {
        const delivery = deliveries.find(d => d.id === deliveryId);
        if (!delivery?.pod_file) {
          toast.error('Please upload Proof of Delivery (POD) before marking as completed');
          return;
        }
      }

      const { error } = await supabase
        .from('deliveries')
        .update({ status: newStatus })
        .eq('id', deliveryId);

      if (error) throw error;

      setDeliveries(prevDeliveries =>
        prevDeliveries.map(delivery =>
          delivery.id === deliveryId
            ? { ...delivery, status: newStatus }
            : delivery
        )
      );

      toast.success(`Delivery status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error('Failed to update delivery status');
    }
  };

  const handlePODUpload = async (deliveryId: string, file: File) => {
    try {
      const BUCKET_NAME = 'delivery-pods';
      const fileExt = file.name.split('.').pop();
      const fileName = `${deliveryId}-pod.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload the file with proper headers
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      // Update both pod_file and status to completed in one operation
      const { error: updateError } = await supabase
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
            ? { 
                ...delivery, 
                pod_file: publicUrl,
                status: 'completed'
              }
            : delivery
        )
      );

      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        completedDeliveries: prevStats.completedDeliveries + 1,
        pendingDeliveries: prevStats.pendingDeliveries - 1
      }));

      toast.success('POD uploaded and delivery marked as completed');
    } catch (error: any) {
      console.error('Error uploading POD:', error);
      toast.error('Failed to upload POD file: ' + (error.message || 'Unknown error'));
    }
  };

  const handleStopUpdate = async (deliveryId: string, stopInfo: DeliveryStop) => {
    try {
      const currentTime = new Date().toISOString();
      console.log('Updating stop for delivery:', deliveryId, 'Stop info:', stopInfo);

      // Create new stop record
      const { data: newStop, error: createError } = await supabase
        .from('delivery_stops')
        .insert({
          delivery_id: deliveryId,
          address: stopInfo.address,
          stop_type: stopInfo.stop_type,
          sequence: stopInfo.sequence,
          status: 'completed',
          actual_arrival_time: currentTime,
          estimated_time: currentTime,
          route_info: stopInfo.route_info
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating stop:', createError);
        toast.error('Failed to update stop');
        return;
      }

      // Update local state
      setDeliveries((prevDeliveries:any) => {
        const updatedDeliveries = prevDeliveries.map((delivery:any) =>
          delivery.id === deliveryId
            ? {
                ...delivery,
                delivery_stops: delivery.delivery_stops?.map((stop:any) =>
                  stop.sequence === stopInfo.sequence
                    ? { 
                        ...stop, 
                        id: newStop.id,
                        status: 'completed',
                        actual_arrival_time: currentTime
                      }
                    : stop
                )
              }
            : delivery
        );

        // Check if all stops are completed for this delivery
        const currentDelivery = updatedDeliveries.find((d:any) => d.id === deliveryId);
        if (currentDelivery) {
          const allStopsCompleted = currentDelivery.delivery_stops?.every((stop:any) => stop.status === 'completed');

          if (allStopsCompleted) {
            // Update delivery status to completed
            supabase
              .from('deliveries')
              .update({ status: 'completed' })
              .eq('id', deliveryId)
              .then(({ error }) => {
                if (error) {
                  console.error('Error updating delivery status:', error);
                } else {
                  // Update the delivery status in local state
                  const finalDeliveries = updatedDeliveries.map((d:any) =>
                    d.id === deliveryId
                      ? { ...d, status: 'completed' }
                      : d
                  );
                  setDeliveries(finalDeliveries);
                  toast.success('All stops completed - Delivery marked as completed');
                }
              });
          }
        }

        return updatedDeliveries;
      });

      toast.success('Stop marked as completed');
      
      // Update stats without refreshing the entire page
      setStats(prevStats => ({
        ...prevStats,
        completedDeliveries: prevStats.completedDeliveries + 1,
        pendingDeliveries: prevStats.pendingDeliveries - 1
      }));

    } catch (error) {
      console.error('Error updating stop:', error);
      toast.error('Failed to update stop');
    }
  };

  const calculateRemainingTime = (estimatedTime: string) => {
    const estimated = new Date(estimatedTime).getTime();
    const now = new Date().getTime();
    const diff = estimated - now;
    
    if (diff < 0) return 'Overdue';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const handleDeliveryFailure = async () => {
    if (!selectedDeliveryId || !failureReason.reason) return;

    try {
      const currentTime = new Date().toISOString();
      const { error } = await supabase
        .from('deliveries')
        .update({ 
          status: 'failed',
          notes: `Failed Delivery - Reason: ${failureReason.reason.replace(/_/g, ' ').toUpperCase()}\nDetails: ${failureReason.details}`
        })
        .eq('id', selectedDeliveryId);

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      setDeliveries(prevDeliveries =>
        prevDeliveries.map(delivery =>
          delivery.id === selectedDeliveryId
            ? { 
                ...delivery, 
                status: 'failed',
                notes: `Failed Delivery - Reason: ${failureReason.reason.replace(/_/g, ' ').toUpperCase()}\nDetails: ${failureReason.details}`
              }
            : delivery
        )
      );

      toast.success('Delivery marked as failed');
      setFailureDialogOpen(false);
      setSelectedDeliveryId(null);
      setFailureReason({ reason: '', details: '' });
    } catch (error) {
      console.error('Error marking delivery as failed:', error);
      toast.error('Failed to update delivery status');
    }
  };

  const renderDeliveryList = (deliveries: Delivery[]) => {
    return (
      <div className="space-y-4">
        {deliveries.map((delivery) => (
          <Accordion type="single" collapsible key={delivery.id}>
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="flex justify-between items-center w-full pr-4">
                  <div className="flex items-center gap-4">
                    <Package className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-left">Package ID: {delivery.package_id}</p>
                      <p className="text-sm text-muted-foreground text-left">
                        {new Date(delivery.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={
                        delivery.priority === 'high' ? 'destructive' :
                        delivery.priority === 'medium' ? 'warning' : 'default'
                      }
                    >
                      {delivery.priority.toUpperCase()}
                    </Badge>
                    <Badge
                      variant={
                        delivery.status === 'completed' ? 'success' :
                        delivery.status === 'in_progress' ? 'warning' :
                        delivery.status === 'failed' ? 'destructive' : 'default'
                      }
                    >
                      {delivery.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-4">
                  {/* Add Shipping Label Display */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4" />
                      Shipping Label
                    </h3>
                    <ShippingLabelDisplay delivery={delivery} />
                  </div>

                  {/* Products Section */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium flex items-center gap-2 mb-3">
                      <Box className="h-4 w-4" />
                      Products
                    </h3>
                    <ScrollArea className="h-[100px]">
                      <div className="space-y-2">
                        {delivery.products.map((product, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span>{product.name}</span>
                            <Badge variant="outline">{product.quantity} units</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Notes Section */}
                  {delivery.notes && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h3 className="font-medium flex items-center gap-2 mb-2">
                        <ClipboardList className="h-4 w-4" />
                        Delivery Notes
                      </h3>
                      <p className="text-sm text-muted-foreground">{delivery.notes}</p>
                    </div>
                  )}

                  {/* Route Summary for Completed/Failed Deliveries */}
                  {(delivery.status === 'completed' || delivery.status === 'failed') && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h3 className="font-medium flex items-center gap-2 mb-3">
                        <Navigation className="h-4 w-4" />
                        Delivery Summary
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Distance:</span>
                          <span>{delivery.optimized_route?.distance.toFixed(2)} km</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Duration:</span>
                          <span>
                            {Math.floor(delivery.optimized_route?.duration || 0)}h {Math.round(((delivery.optimized_route?.duration || 0) % 1) * 60)}m
                          </span>
                        </div>
                        {delivery.optimized_route?.totalFuelCost && (
                          <div className="flex justify-between text-sm">
                            <span>Total Fuel Cost:</span>
                            <span>Rs. {Math.round(delivery.optimized_route.totalFuelCost)}</span>
                          </div>
                        )}
                        {delivery.status === 'failed' && delivery.notes?.startsWith('Failed Delivery') && (
                          <div className="mt-2">
                            <span className="text-sm font-medium">Failure Information:</span>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                              {delivery.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Route and Stops Section for Active Deliveries */}
                  {delivery.status === 'in_progress' && (
                    <div className="space-y-6">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-medium flex items-center gap-2 mb-3">
                          <Navigation className="h-4 w-4" />
                          Route Information
                        </h3>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Total Distance:</span>
                            <span>{delivery.optimized_route?.distance.toFixed(2)} km</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Estimated Duration:</span>
                            <span>
                              {Math.floor(delivery.optimized_route?.duration || 0)}h {Math.round(((delivery.optimized_route?.duration || 0) % 1) * 60)}m
                            </span>
                          </div>
                          {delivery.optimized_route?.totalFuelCost && (
                            <div className="flex justify-between text-sm">
                              <span>Estimated Fuel Cost:</span>
                              <span>Rs. {Math.round(delivery.optimized_route.totalFuelCost)}</span>
                            </div>
                          )}
                        </div>

                        {/* Map View */}
                        {delivery.delivery_stops && delivery.delivery_stops.length > 0 && (
                          <DeliveryMap stops={delivery.delivery_stops} />
                        )}

                        <div className="space-y-3 mt-6">
                          {delivery.delivery_stops?.map((stop, index) => (
                            <div key={index} className="border rounded-lg p-3 bg-background">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium">
                                    Stop {index + 1}: {stop.stop_type === 'pickup' ? 'Pickup' : 'Delivery'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{stop.address}</p>
                                  <div className="mt-1 space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                      Distance from start: {stop.route_info?.distance.toFixed(2)} km
                                    </p>
                                    {index > 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        {/* @ts-expect-error hkj */}
                                        Distance from previous: {stop.route_info?.distanceFromPrevious.toFixed(2)} km
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      Duration: {Math.floor(stop.route_info?.duration || 0)}h {Math.round(((stop.route_info?.duration || 0) % 1) * 60)}m
                                    </p>
                                    {index > 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        {/* @ts-expect-error hkj */}
                                        Duration from previous: {Math.floor(stop.route_info?.durationFromPrevious || 0)}h {Math.round(((stop.route_info?.durationFromPrevious || 0) % 1) * 60)}m
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      Traffic: {stop.route_info?.traffic || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Weather: {stop.route_info?.weather || 'Unknown'}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant={stop.status === 'completed' ? 'success' : 'default'}
                                >
                                  {stop.status.toUpperCase()}
                                </Badge>
                              </div>

                              {delivery.status === 'in_progress' && stop.status === 'pending' && (
                                <div className="mt-2 space-y-2">
                                        {/* @ts-expect-error hkj */}
                                  {stop.route_info?.estimated_time && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Timer className="h-4 w-4" />
                                        {/* @ts-expect-error hkj */}
                                      {calculateRemainingTime(stop.route_info.estimated_time)}
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleStopUpdate(delivery.id, stop);
                                    }}
                                  >
                                    Mark as Reached
                                  </Button>
                                </div>
                              )}

                              {stop.actual_arrival_time && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  Arrived: {new Date(stop.actual_arrival_time).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* POD Section */}
                  {delivery.status === 'in_progress' && (
                    <div className="bg-muted/50 p-4 rounded-lg mt-4">
                      <h3 className="font-medium flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4" />
                        Proof of Delivery (POD)
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-4">
                            Instructions:
                            1. Download the shipping label with receiver's signature section
                            2. Get the receiver's signature on the printed label
                            3. Take a clear photo of the signed label
                            4. Upload the photo here as POD
                            <br />
                            <strong>Note: Order will be automatically marked as completed upon POD upload</strong>
                          </p>
                          {!delivery.pod_file ? (
                            <div className="space-y-2">
                              <input
                                type="file"
                                accept="image/*"
                                className="w-full"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handlePODUpload(delivery.id, file);
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                Accepted formats: PNG, JPG, JPEG
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-green-600">✓ POD uploaded successfully - Delivery completed</p>
                              <a
                                href={delivery.pod_file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View uploaded POD
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {delivery.status !== 'completed' && delivery.status !== 'failed' && (
                    <div className="flex gap-2">
                      {delivery.status === 'pending' && (
                        <Button
                          type="button"
                          className="w-full"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStatusUpdate(delivery.id, 'in_progress');
                          }}
                        >
                          Start Delivery
                        </Button>
                      )}
                      {delivery.status === 'in_progress' && (
                        <>
                          <Button
                            type="button"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStatusUpdate(delivery.id, 'completed');
                            }}
                          >
                            Complete Delivery
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStatusUpdate(delivery.id, 'failed');
                            }}
                          >
                            Mark as Failed
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    );
  };

  const failureDialog = (
    <Dialog open={failureDialogOpen} onOpenChange={setFailureDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Delivery as Failed</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Failure</label>
            <Select
              value={failureReason.reason}
              onValueChange={(value) => setFailureReason(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_unavailable">Customer Unavailable</SelectItem>
                <SelectItem value="wrong_address">Wrong Address</SelectItem>
                <SelectItem value="package_damaged">Package Damaged</SelectItem>
                <SelectItem value="vehicle_breakdown">Vehicle Breakdown</SelectItem>
                <SelectItem value="weather_conditions">Bad Weather Conditions</SelectItem>
                <SelectItem value="traffic_issues">Severe Traffic Issues</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Details</label>
            <Textarea
              value={failureReason.details}
              onChange={(e) => setFailureReason(prev => ({ ...prev, details: e.target.value }))}
              placeholder="Provide more details about the failure..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setFailureDialogOpen(false);
              setSelectedDeliveryId(null);
              setFailureReason({ reason: '', details: '' });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeliveryFailure}
            disabled={!failureReason.reason}
          >
            Mark as Failed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Sidebar */}
      <aside className="w-72 min-h-screen flex flex-col px-6 py-8 bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl border border-blue-100 fixed">
        {/* Logo/Title */}
        <div className="flex flex-col items-center mb-8">
          <span className="font-extrabold text-2xl text-blue-700 flex items-center gap-2 tracking-tight select-none mb-2">
            OMNI<span className="text-blue-500">-WTMS</span>
          </span>
          {/* Profile Card */}
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700 mb-2">
            {courierData?.name ? courierData.name[0].toUpperCase() : 'C'}
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-gray-900">{courierData?.name || 'Courier'}</div>
            <div className="text-xs text-gray-500">{courierData?.email || ''}</div>
          </div>
          {/* Logout Button */}
          <button
            onClick={() => {
              localStorage.removeItem('currentCourier');
              router.push('/auth/login');
            }}
            className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2 justify-center py-2 rounded-lg font-medium transition-colors shadow-sm border border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
            Sign Out
          </button>
        </div>
        {/* Navigation */}
        <nav className="flex flex-col gap-2 mt-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2 rounded-xl text-base font-medium transition-all",
              activeTab === 'dashboard'
                ? "bg-blue-100 text-blue-700 shadow border border-blue-200"
                : "hover:bg-blue-50 text-gray-700"
            )}
          >
            <Package className="h-5 w-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2 rounded-xl text-base font-medium transition-all",
              activeTab === 'assigned'
                ? "bg-blue-100 text-blue-700 shadow border border-blue-200"
                : "hover:bg-blue-50 text-gray-700"
            )}
          >
            <Truck className="h-5 w-5" />
            Assigned Deliveries
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2 rounded-xl text-base font-medium transition-all",
              activeTab === 'completed'
                ? "bg-blue-100 text-blue-700 shadow border border-blue-200"
                : "hover:bg-blue-50 text-gray-700"
            )}
          >
            <CheckCircle className="h-5 w-5" />
            Completed Deliveries
          </button>
          <button
            onClick={() => setActiveTab('failed')}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2 rounded-xl text-base font-medium transition-all",
              activeTab === 'failed'
                ? "bg-blue-100 text-blue-700 shadow border border-blue-200"
                : "hover:bg-blue-50 text-gray-700"
            )}
          >
            <AlertCircle className="h-5 w-5" />
            Failed Deliveries
          </button>
        </nav>
      </aside>
      {/* Main Content */}
      <div className="flex-1 p-8 ml-72">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome back, {courierData?.name}!
              </h1>
              <p className="text-gray-600">
                Managing deliveries for {courierData?.email}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total Deliveries
                  </CardTitle>
                  <Package className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Completed
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedDeliveries}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Pending
                  </CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Failed
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.failedDeliveries}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total Distance
                  </CardTitle>
                  <MapIcon className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(stats.totalDistance)} km</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Deliveries</CardTitle>
                <CardDescription>Your latest delivery assignments and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {renderDeliveryList(deliveries.slice(0, 5))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'assigned' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Assigned Deliveries</h2>
              <Badge variant="secondary">
                {deliveries.filter(d => d.status === 'pending' || d.status === 'in_progress').length} Active
              </Badge>
            </div>
            {renderDeliveryList(
              deliveries.filter(d => d.status === 'pending' || d.status === 'in_progress')
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Completed Deliveries</h2>
              <Badge variant="secondary">
                {deliveries.filter(d => d.status === 'completed').length} Total
              </Badge>
            </div>
            {renderDeliveryList(
              deliveries.filter(d => d.status === 'completed')
            )}
          </div>
        )}

        {activeTab === 'failed' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Failed Deliveries</h2>
              <Badge variant="secondary">
                {deliveries.filter(d => d.status === 'failed').length} Total
              </Badge>
            </div>
            {renderDeliveryList(
              deliveries.filter(d => d.status === 'failed')
            )}
          </div>
        )}
      </div>
      {failureDialog}
    </div>
  );
} 