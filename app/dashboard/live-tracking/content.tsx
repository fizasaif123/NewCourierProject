'use client';

import { Suspense, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Truck, Clock, CheckCircle, MapPin, Package, AlertCircle, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface CourierDelivery {
  id: string;
  courier_id: string;
  courier_name: string;
  current_location: {
    latitude: number;
    longitude: number;
    last_updated: string;
  };
  current_delivery: {
    id: string;
    pickup_address: string;
    delivery_address: string;
    status: string;
    estimated_delivery_time: string;
    priority: 'high' | 'medium' | 'low';
    pod_file?: string;
  };
  stops: {
    id: string;
    address: string;
    status: 'completed' | 'pending' | 'current';
    estimated_arrival: string;
    actual_arrival?: string;
    latitude: number;
    longitude: number;
    order: number;
  }[];
  messages?: {
    id: string;
    sender: 'client' | 'courier';
    content: string;
    timestamp: string;
  }[];
}

// Add CompletedDeliveries component
const CompletedDeliveries = ({ deliveries }: { deliveries: CourierDelivery[] }) => {
  const completedDeliveries = deliveries.filter(d => d.current_delivery.status === 'completed');

  if (completedDeliveries.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-xl">
        <p className="text-gray-500">No completed deliveries yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {completedDeliveries.map((delivery) => (
        <Card key={delivery.id} className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Delivery #{delivery.current_delivery.id.slice(0, 8)}
              </CardTitle>
              <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">
                Completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">From</p>
                  <p className="text-sm">{delivery.current_delivery.pickup_address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">To</p>
                  <p className="text-sm">{delivery.current_delivery.delivery_address}</p>
                </div>
              </div>
              
              {delivery.current_delivery.pod_file && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Proof of Delivery</p>
                  <div className="border rounded-lg p-4">
                    <a
                      href={delivery.current_delivery.pod_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Package className="h-4 w-4" />
                      <span className="text-sm">View POD</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default function LiveTrackingContent() {
  const [activeCouriers, setActiveCouriers] = useState<CourierDelivery[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  // Calculate time remaining until estimated delivery
  const getTimeRemaining = (estimatedTime: string) => {
    const remaining = new Date(estimatedTime).getTime() - new Date().getTime();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Calculate completion percentage
  const getCompletionPercentage = (stops: CourierDelivery['stops']) => {
    const completed = stops.filter(stop => stop.status === 'completed').length;
    return (completed / stops.length) * 100;
  };

  // Function to send message
  const sendMessage = async (courierId: string) => {
    if (!newMessage.trim()) return;

    setMessageError(null);
    try {
      console.log('Sending message:', {
        delivery_id: courierId,
        sender: 'client',
        content: newMessage.trim()
      });

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            delivery_id: courierId,
            sender: 'client',
            content: newMessage.trim(),
            timestamp: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);

      // Update local state
      setActiveCouriers(prev => prev.map(courier => {
        if (courier.id === courierId) {
          return {
            ...courier,
            messages: [
              ...(courier.messages || []),
              {
                id: data[0].id,
                sender: data[0].sender,
                content: data[0].content,
                timestamp: data[0].timestamp
              }
            ]
          };
        }
        return courier;
      }));

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessageError('Failed to send message. Please try again.');
    }
  };

  // Function to fetch messages for a delivery
  const fetchMessages = async (deliveryId: string) => {
    try {
      console.log('Fetching messages for delivery:', deliveryId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      console.log('Fetched messages:', data);
      return data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  // Fetch messages when courier is selected
  useEffect(() => {
    if (selectedCourier) {
      console.log('Selected courier changed, fetching messages for:', selectedCourier);
      fetchMessages(selectedCourier).then(messages => {
        console.log('Setting messages for courier:', messages);
        setActiveCouriers(prev => prev.map(courier => {
          if (courier.id === selectedCourier) {
            return { ...courier, messages };
          }
          return courier;
        }));
      });
    }
  }, [selectedCourier]);

  // Set up real-time subscription for messages
  useEffect(() => {
    if (selectedCourier) {
      console.log('Setting up message subscription for courier:', selectedCourier);
      
      const messageSubscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `delivery_id=eq.${selectedCourier}`
        }, (payload) => {
          console.log('Received message update:', payload);
          if (payload.eventType === 'INSERT') {
            setActiveCouriers(prev => prev.map(courier => {
              if (courier.id === selectedCourier) {
                return {
                  ...courier,
                  messages: [
                    ...(courier.messages || []),
                    {
                      id: payload.new.id,
                      sender: payload.new.sender,
                      content: payload.new.content,
                      timestamp: payload.new.timestamp
                    }
                  ]
                };
              }
              return courier;
            }));
          }
        })
        .subscribe();

      return () => {
        console.log('Cleaning up message subscription');
        messageSubscription.unsubscribe();
      };
    }
  }, [selectedCourier, supabase]);

  // Fetch active couriers and their deliveries
  useEffect(() => {
    const fetchActiveCouriers = async () => {
      try {
        // Get current client ID from localStorage
        const currentUser = localStorage.getItem('currentUser');
        const userData = JSON.parse(currentUser || '{}');
        const clientId = userData.id;

        console.log('Fetching deliveries for client:', clientId);
      
        const { data: deliveries, error: deliveriesError } = await supabase
          .from('deliveries')
          .select(`
            id,
            status,
            courier_id,
            pod_file,
            client_id,
            couriers!courier_id (
              id,
              name,
              current_latitude,
              current_longitude,
              last_location_update
            ),
            delivery_stops (
              id,
              address,
              status,
              estimated_arrival,
              actual_arrival,
              latitude,
              longitude,
              stop_order
            )
          `)
          .eq('client_id', clientId) // Filter by client_id
          .or('status.eq.in_progress,status.eq.completed');

        if (deliveriesError) {
          console.error('Error fetching deliveries:', deliveriesError);
          return;
        }

        console.log('Fetched deliveries for client:', deliveries);

        // Transform the data for our UI
        const transformedData = deliveries.map(delivery => {
          console.log('Processing delivery:', delivery);
          
          // Get the first and last stops for pickup/delivery addresses
          const stops = delivery.delivery_stops || [];
          const pickupAddress = stops[0]?.address || 'Pickup address not set';
          const deliveryAddress = stops[stops.length - 1]?.address || 'Delivery address not set';

          const courierObj = Array.isArray(delivery.couriers) ? delivery.couriers[0] : delivery.couriers;

          return {
            id: delivery.id,
            courier_id: delivery.courier_id,
            courier_name: courierObj?.name || 'Unknown Courier',
            current_location: {
              latitude: courierObj?.current_latitude || 12.9716, // Default to Bangalore
              longitude: courierObj?.current_longitude || 77.5946,
              last_updated: courierObj?.last_location_update || new Date().toISOString()
            },
            current_delivery: {
              id: delivery.id,
              pickup_address: pickupAddress,
              delivery_address: deliveryAddress,
              status: delivery.status,
              estimated_delivery_time: stops[stops.length - 1]?.estimated_arrival || new Date(Date.now() + 3600000).toISOString(),

            //  @ts-expect-error kj kj
            priority: ['high', 'medium', 'low'].includes(delivery.priority) ? delivery.priority : 'medium',
              pod_file: delivery.pod_file
            },
            stops: stops.map((stop, index) => ({
              id: stop.id,
              address: stop.address,
              status: stop.status || 'pending',
              estimated_arrival: stop.estimated_arrival || new Date(Date.now() + (index + 1) * 1800000).toISOString(), // Default to 30 mins between stops
              actual_arrival: stop.actual_arrival,
              latitude: stop.latitude || 12.9716 + (index * 0.01), // Default coordinates with slight offset
              longitude: stop.longitude || 77.5946 + (index * 0.01),
              order: stop.stop_order || index
            })),
            messages: []
          };
        });

        console.log('Transformed data:', transformedData);
        setActiveCouriers(transformedData);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
      }
    };

    // Initial fetch
    fetchActiveCouriers();

    // Set up real-time subscription
    const deliverySubscription = supabase
      .channel('courier-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deliveries'
      }, () => {
        fetchActiveCouriers();
      })
      .subscribe();

    return () => {
      deliverySubscription.unsubscribe();
    };
  }, [supabase]);

  // Show loading state
  if (activeCouriers.length === 0) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Active Deliveries</h2>
          <p className="text-muted-foreground">
            When a courier starts delivering or starts a route, you can see live tracking here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4 p-4 bg-gray-50">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Live Tracking</h1>
            <p className="text-base lg:text-lg text-gray-600 mt-2">Monitor active deliveries in real-time</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 hover:border-blue-200 transition-colors">
              <div className="text-sm font-semibold text-blue-700">Active</div>
              <div className="text-xl lg:text-2xl font-bold text-blue-800 mt-1">{activeCouriers.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 hover:border-green-200 transition-colors">
              <div className="text-sm font-semibold text-green-700">Completed</div>
              <div className="text-xl lg:text-2xl font-bold text-green-800 mt-1">
                {activeCouriers.reduce((acc, courier) => 
                  acc + courier.stops.filter(stop => stop.status === 'completed').length, 0
                )}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 hover:border-orange-200 transition-colors">
              <div className="text-sm font-semibold text-orange-700">In Transit</div>
              <div className="text-xl lg:text-2xl font-bold text-orange-800 mt-1">
                {activeCouriers.filter(c => c.stops.some(s => s.status === 'current')).length}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 hover:border-purple-200 transition-colors">
              <div className="text-sm font-semibold text-purple-700">Priority</div>
              <div className="text-xl lg:text-2xl font-bold text-purple-800 mt-1">
                {activeCouriers.filter(c => c.current_delivery.priority === 'high').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Courier List Sidebar */}
        <div className="w-full lg:w-[450px] bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Couriers</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {activeCouriers.length} active deliveries
                </p>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {activeCouriers.map((courier) => (
                <Card
                  key={courier.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedCourier === courier.id ? 'border-2 border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedCourier(courier.id)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Truck className="h-5 w-5 text-blue-500" />
                          {`Courier ${courier.courier_id.slice(0, 8)}`}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={
                            courier.current_delivery.priority === 'high' ? 'destructive' :
                            courier.current_delivery.priority === 'medium' ? 'default' :
                            'secondary'
                          } className="text-xs px-2 py-0.5">
                            {courier.current_delivery.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {courier.stops.filter(stop => stop.status === 'completed').length} / {courier.stops.length} Stops
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-4">
                      {/* Current Stop */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Current Location</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {courier.stops.map((stop, index) => (
                            <div key={stop.id} className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                stop.status === 'completed' ? 'bg-green-500' :
                                stop.status === 'current' ? 'bg-blue-500' :
                                'bg-gray-300'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-medium text-gray-900">
                                    Stop {index + 1}
                                  </div>
                                  {stop.status === 'completed' && stop.actual_arrival && (
                                    <div className="text-xs text-gray-500">
                                      {new Date(stop.actual_arrival).toLocaleTimeString()}
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {stop.address}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Progress Overview */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                          <div className="text-xs font-semibold text-green-700">Done</div>
                          <div className="text-lg font-bold text-green-800 mt-1">
                            {courier.stops.filter(stop => stop.status === 'completed').length}
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                          <div className="text-xs font-semibold text-blue-700">Current</div>
                          <div className="text-lg font-bold text-blue-800 mt-1">
                            {courier.stops.filter(stop => stop.status === 'current').length}
                          </div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                          <div className="text-xs font-semibold text-orange-700">Left</div>
                          <div className="text-lg font-bold text-orange-800 mt-1">
                            {courier.stops.filter(stop => stop.status === 'pending').length}
                          </div>
                        </div>
                      </div>

                      {/* Time and ETA */}
                      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-gray-600" />
                          <div>
                            <div className="text-xs text-gray-600">Estimated Arrival</div>
                            <div className="text-sm font-medium text-gray-900">
                              {getTimeRemaining(courier.current_delivery.estimated_delivery_time)}
                            </div>
                          </div>
                        </div>
                        <Progress 
                          value={getCompletionPercentage(courier.stops)} 
                          className="w-24 h-2"
                        />
                      </div>

                      {/* Messaging Section */}
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">Messages</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {courier.messages?.length || 0}
                          </Badge>
                        </div>
                        {messageError && (
                          <div className="text-sm text-red-600 mb-3 p-3 bg-red-50 rounded-lg">
                            {messageError}
                          </div>
                        )}
                        <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                          {courier.messages?.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-3">
                              No messages yet
                            </div>
                          ) : (
                            courier.messages?.map((message) => (
                              <div
                                key={message.id}
                                className={`p-3 rounded-xl ${
                                  message.sender === 'client'
                                    ? 'bg-blue-100 text-blue-900 ml-4'
                                    : 'bg-gray-100 text-gray-900 mr-4'
                                }`}
                              >
                                <div className="text-xs font-medium mb-1">
                                  {message.sender === 'client' ? 'You' : 'Courier'}
                                </div>
                                <div className="text-sm">{message.content}</div>
                                <div className="text-xs mt-1 opacity-70">
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                sendMessage(courier.id);
                              }
                            }}
                            placeholder="Type your message..."
                            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                          />
                          <button
                            onClick={() => sendMessage(courier.id)}
                            disabled={!newMessage.trim()}
                            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Map and Completed Deliveries Section */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Map Section */}
          <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-700" />
                  <span className="text-base font-medium text-gray-900">Live Map</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300">
                    Satellite
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300">
                    Traffic
                  </button>
                </div>
              </div>
            </div>
            <MapContainer
              center={[12.9716, 77.5946]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {activeCouriers.map((courier) => {
                if (!selectedCourier || selectedCourier === courier.id) {
                  return (
                    <div key={courier.id}>
                      {/* Courier Marker */}
                      <Marker
                        position={[courier.current_location.latitude, courier.current_location.longitude]}
                      >
                        <Popup>
                          <div className="p-3">
                            <h3 className="font-bold text-gray-900">{courier.courier_name}</h3>
                            <p className="text-sm text-gray-600">
                              Last updated: {new Date(courier.current_location.last_updated).toLocaleTimeString()}
                            </p>
                            <div className="mt-2 text-sm">
                              <div className="font-medium text-gray-900">Current Delivery</div>
                              <p className="text-gray-600">{courier.current_delivery.delivery_address}</p>
                            </div>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Stop Markers */}
                      {courier.stops.map((stop, index) => (
                        <Marker
                          key={stop.id}
                          position={[stop.latitude, stop.longitude]}
                        >
                          <Popup>
                            <div className="p-3">
                              <h3 className="font-bold text-gray-900">Stop {index + 1}</h3>
                              <p className="text-sm text-gray-600">{stop.address}</p>
                              <div className="mt-2">
                                <Badge variant={
                                  stop.status === 'completed' ? 'default' :
                                  stop.status === 'current' ? 'secondary' :
                                  'outline'
                                } className="capitalize">
                                  {stop.status}
                                </Badge>
                                {stop.actual_arrival && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Arrived: {new Date(stop.actual_arrival).toLocaleTimeString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}

                      {/* Route Line */}
                      <Polyline
                        positions={courier.stops.map(stop => [stop.latitude, stop.longitude])}
                        color={selectedCourier === courier.id ? "#3b82f6" : "#9ca3af"}
                        weight={selectedCourier === courier.id ? 4 : 2}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </MapContainer>
          </div>

          {/* Completed Deliveries Section */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Completed Deliveries</h2>
              <Badge variant="outline">
                {activeCouriers.filter(c => c.current_delivery.status === 'completed').length}
              </Badge>
            </div>
            <CompletedDeliveries deliveries={activeCouriers} />
          </div>
        </div>
      </div>
    </div>
  );
} 
