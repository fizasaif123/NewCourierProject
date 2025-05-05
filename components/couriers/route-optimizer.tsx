'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { X } from "lucide-react";

interface RoutePoint {
  id: string;
  name: string;
  coordinates: [number, number];
  type: 'start' | 'destination' | 'waypoint';
}

interface Route {
  id: string;
  name: string;
  distance: number;
  duration: number;
  fuelCost: number;
  points: RoutePoint[];
  description: string;
  trafficLevel: string;
  roadType: string;
  estimatedBreaks: number;
}

interface RouteOptimizerProps {
  currentRoute: RoutePoint[];
  onRouteSelect: (route: Route) => void;
}

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Mock data for route points in the UK
const UK_LOCATIONS = {
  'London Depot': [51.5074, -0.1278],
  'Manchester Hub': [53.4808, -2.2426],
  'Birmingham Center': [52.4862, -1.8904],
  'Leeds Warehouse': [53.8008, -1.5491],
  'Glasgow Store': [55.8642, -4.2518],
  'Cardiff Point': [51.4816, -3.1791],
  'Edinburgh Base': [55.9533, -3.1883],
  'Bristol Hub': [51.4545, -2.5879],
  'Liverpool Center': [53.4084, -2.9916],
  'Newcastle Point': [54.9783, -1.6178]
};

// Enhanced mock data with realistic values
const generateAlternativeRoutes = (points: RoutePoint[]): Route[] => {
  // Base values for realistic calculations
  const baseDistance = Math.max(150, calculateRouteDistance(points)); // Minimum 150km
  const baseDuration = baseDistance * 3; // 3 minutes per km
  const baseFuelCost = baseDistance * 0.15; // £0.15 per km

  return [
    {
      id: 'route-1',
      name: 'Express Route',
      distance: 187.5, // Fixed realistic distance
      duration: 210, // 3.5 hours in minutes
      fuelCost: 45.50,
      points: [...points],
      description: 'Fastest route using highways',
      trafficLevel: 'Low',
      roadType: 'Highway',
      estimatedBreaks: 1,
    },
    {
      id: 'route-2',
      name: 'Eco-friendly Route',
      distance: 195.2,
      duration: 245, // About 4 hours
      fuelCost: 38.75,
      points: shuffleWaypoints([...points]),
      description: 'Optimized for fuel efficiency',
      trafficLevel: 'Medium',
      roadType: 'Mixed',
      estimatedBreaks: 2,
    },
    {
      id: 'route-3',
      name: 'Balanced Route',
      distance: 192.3,
      duration: 225, // About 3.75 hours
      fuelCost: 42.25,
      points: shuffleWaypoints([...points]),
      description: 'Best mix of speed and efficiency',
      trafficLevel: 'Medium',
      roadType: 'Mixed',
      estimatedBreaks: 1,
    }
  ];
};

function calculateRouteDistance(points: RoutePoint[]): number {
  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    distance += getDistance(points[i].coordinates, points[i + 1].coordinates);
  }
  return distance;
}

function getDistance(coord1: [number, number], coord2: [number, number]): number {
  // Simple distance calculation (in km)
  const R = 6371; // Earth's radius in km
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function shuffleWaypoints(points: RoutePoint[]): RoutePoint[] {
  const start = points[0];
  const end = points[points.length - 1];
  const waypoints = points.slice(1, -1);
  
  for (let i = waypoints.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [waypoints[i], waypoints[j]] = [waypoints[j], waypoints[i]];
  }
  
  return [start, ...waypoints, end];
}

export function RouteOptimizer({ currentRoute, onRouteSelect }: RouteOptimizerProps) {
  const { toast } = useToast();
  const [alternativeRoutes, setAlternativeRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showInitialButton, setShowInitialButton] = useState(true);

  const handleOptimizeRoute = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    const routes = generateAlternativeRoutes(currentRoute);
    setAlternativeRoutes(routes);
    setIsLoading(false);
    setShowInitialButton(false); // Hide the button after routes are loaded
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    setShowComparison(true);
  };

  const handleConfirmRoute = () => {
    if (selectedRoute) {
      setShowSuccessDialog(true);
      setTimeout(() => {
        setShowSuccessDialog(false);
        onRouteSelect(selectedRoute);
      }, 2000);
    }
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto px-4">
      {showInitialButton && (
        <div className="flex items-center justify-center py-4">
          <Button 
            onClick={handleOptimizeRoute}
            disabled={isLoading}
            size="lg"
            className="min-w-[150px]"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Analyzing...
              </>
            ) : (
              'Find Routes'
            )}
          </Button>
        </div>
      )}

      {alternativeRoutes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alternativeRoutes.map((route) => (
            <Card 
              key={route.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedRoute?.id === route.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleRouteSelect(route)}
            >
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center justify-between">
                  {route.name}
                  {selectedRoute?.id === route.id && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </CardTitle>
                <CardDescription>{route.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[200px] relative rounded-md overflow-hidden">
                  <MapContainer
                    bounds={L.latLngBounds(route.points.map(p => p.coordinates))}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {route.points.map((point, index) => (
                      <Marker key={point.id} position={point.coordinates} icon={icon}>
                        <Popup>{point.name}</Popup>
                      </Marker>
                    ))}
                    <Polyline 
                      positions={route.points.map(p => p.coordinates)}
                      color={selectedRoute?.id === route.id ? "#0ea5e9" : "#64748b"}
                      weight={3}
                    />
                  </MapContainer>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Distance</p>
                    <p className="text-2xl font-bold">{route.distance.toFixed(1)} km</p>
                  </div>
                  <div className="space-y-1 bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-2xl font-bold">{(route.duration / 60).toFixed(1)}h</p>
                  </div>
                  <div className="space-y-1 bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Fuel Cost</p>
                    <p className="text-2xl font-bold">£{route.fuelCost.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1 bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Traffic</p>
                    <p className="text-lg font-medium">{route.trafficLevel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showComparison && selectedRoute && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Route Comparison</CardTitle>
            <CardDescription>
              See how the optimized route compares to the current route
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Current Route</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Distance</p>
                    <p className="text-xl font-bold">198.5 km</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-xl font-bold">4.2 hours</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Fuel Cost</p>
                    <p className="text-xl font-bold">£48.75</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Optimized Route ({selectedRoute.name})</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Distance</p>
                    <p className="text-xl font-bold text-green-600">{selectedRoute.distance.toFixed(1)} km</p>
                    <p className="text-sm text-green-600">
                      Save {((198.5 - selectedRoute.distance) / 198.5 * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-xl font-bold text-green-600">{(selectedRoute.duration / 60).toFixed(1)} hours</p>
                    <p className="text-sm text-green-600">
                      Save {((4.2 - selectedRoute.duration / 60) / 4.2 * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Fuel Cost</p>
                    <p className="text-xl font-bold text-green-600">£{selectedRoute.fuelCost.toFixed(2)}</p>
                    <p className="text-sm text-green-600">
                      Save £{(48.75 - selectedRoute.fuelCost).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleConfirmRoute}
                size="lg"
                className="w-full md:w-auto"
              >
                Confirm New Route
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog 
        open={showSuccessDialog} 
        onOpenChange={(open) => {
          setShowSuccessDialog(open);
          if (!open) {
            // Close the entire optimization dialog when success message is dismissed
            onRouteSelect(selectedRoute!);
          }
        }}
      >
        <AlertDialogContent className="bg-green-50 sm:max-w-[425px]">
          <div className="flex justify-between items-start">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-green-700">
                Excellent choice! 🎉
              </AlertDialogTitle>
              <AlertDialogDescription className="text-green-600">
                You've selected the optimal route that saves {
                  ((calculateRouteDistance(currentRoute) - selectedRoute?.distance!) / calculateRouteDistance(currentRoute) * 100).toFixed(1)
                }% distance and £{
                  (calculateRouteDistance(currentRoute) * 0.15 - selectedRoute?.fuelCost!).toFixed(2)
                } in fuel costs.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setShowSuccessDialog(false);
                onRouteSelect(selectedRoute!);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 