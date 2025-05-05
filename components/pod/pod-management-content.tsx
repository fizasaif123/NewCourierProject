import { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar as CalendarIcon, FileCheck, FileX, Clock } from "lucide-react";
import { LiveMap } from "./live-map";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { POD_IMAGES, SIGNATURES } from './assets';

interface POD {
  id: string;
  routeId: string;
  orderReference: string;
  customerName: string;
  deliveryDate: string;
  status: 'delivered' | 'pending';
  driver: {
    id: string;
    name: string;
    avatar?: string;
  };
  location: {
    address: string;
    coordinates: [number, number];
  };
  podDetails?: {
    signature: string;
    image: string;
    notes?: string;
    receivedBy: string;
    timestamp: string;
  };
}

// Create sample data with today's date
const today = new Date();

const SAMPLE_PODS = [
  {
    id: "pod1",
    routeId: "RT001",
    orderReference: "ORD-2024-001",
    customerName: "John Smith",
    deliveryDate: format(today, 'yyyy-MM-dd'),
    status: "delivered" as const,
    driver: {
      id: "d1",
      name: "Mike Johnson",
      avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Mike"
    },
    location: {
      address: "123 Oxford Street, London W1D 1DF",
      coordinates: [51.5152, -0.1454] as [number, number]
    },
    podDetails: {
      signature: SIGNATURES.sig1,
      image: POD_IMAGES.pod1,
      receivedBy: "John Smith",
      timestamp: today.toISOString(),
      notes: "Delivered to reception"
    }
  },
  {
    id: "pod2",
    routeId: "RT002",
    orderReference: "ORD-2024-002",
    customerName: "Sarah Williams",
    deliveryDate: format(today, 'yyyy-MM-dd'),
    status: "pending" as const,
    driver: {
      id: "d2",
      name: "David Chen",
      avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=David"
    },
    location: {
      address: "45 Liverpool Street, London EC2M 7PY",
      coordinates: [51.5171, -0.0826] as [number, number]
    }
  },
  {
    id: "pod3",
    routeId: "RT003",
    orderReference: "ORD-2024-003",
    customerName: "Emma Brown",
    deliveryDate: format(today, 'yyyy-MM-dd'),
    status: "delivered" as const,
    driver: {
      id: "d3",
      name: "James Wilson",
      avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=James"
    },
    location: {
      address: "78 Baker Street, London W1U 6EX",
      coordinates: [51.5206, -0.1570] as [number, number]
    },
    podDetails: {
      signature: SIGNATURES.sig2,
      image: POD_IMAGES.pod2,
      receivedBy: "Emma Brown",
      timestamp: today.toISOString(),
      notes: "Left with security"
    }
  }
];

export function PODManagementContent() {
  const [selectedPOD, setSelectedPOD] = useState<(typeof SAMPLE_PODS)[0] | null>(null);
  const [showPODDetails, setShowPODDetails] = useState(false);
  const [date, setDate] = useState<Date>(today);

  // Use all pods for now (remove date filtering temporarily)
  const filteredPods = SAMPLE_PODS;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">POD Management</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && setDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left">Order Ref</th>
                  <th className="p-4 text-left">Customer</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Driver</th>
                  <th className="p-4 text-left">Location</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPods.map((pod) => (
                  <tr key={pod.id} className="border-b">
                    <td className="p-4">{pod.orderReference}</td>
                    <td className="p-4">{pod.customerName}</td>
                    <td className="p-4">
                      <Badge variant={pod.status === 'delivered' ? 'success' : 'warning'}>
                        {pod.status === 'delivered' ? 'Delivered' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={pod.driver.avatar} alt={pod.driver.name} />
                          <AvatarFallback>{pod.driver.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {pod.driver.name}
                      </div>
                    </td>
                    <td className="p-4">{pod.location.address}</td>
                    <td className="p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPOD(pod);
                          setShowPODDetails(true);
                        }}
                        disabled={pod.status !== 'delivered'}
                      >
                        {pod.status === 'delivered' ? 'View POD' : 'Pending'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="cards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPods.map((pod) => (
              <Card key={pod.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{pod.orderReference}</CardTitle>
                      <p className="text-sm text-muted-foreground">{pod.customerName}</p>
                    </div>
                    <Badge variant={pod.status === 'delivered' ? 'success' : 'warning'}>
                      {pod.status === 'delivered' ? 'Delivered' : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={pod.driver.avatar} alt={pod.driver.name} />
                        <AvatarFallback>{pod.driver.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{pod.driver.name}</p>
                        <p className="text-xs text-muted-foreground">Driver</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1" />
                        <p className="text-sm">{pod.location.address}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={pod.status === 'delivered' ? 'default' : 'outline'}
                    onClick={() => {
                      if (pod.status === 'delivered') {
                        setSelectedPOD(pod);
                        setShowPODDetails(true);
                      }
                    }}
                    disabled={pod.status !== 'delivered'}
                  >
                    {pod.status === 'delivered' ? (
                      <>
                        <FileCheck className="h-4 w-4 mr-2" />
                        View POD
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Pending Delivery
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="map">
          <div className="border rounded-lg p-4">
            <div className="h-[600px]">
              <LiveMap pods={filteredPods} onPODSelect={setSelectedPOD} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showPODDetails} onOpenChange={setShowPODDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Delivery Confirmation - {selectedPOD?.orderReference}</DialogTitle>
          </DialogHeader>
          {selectedPOD?.podDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Delivery Details</h3>
                  <div className="space-y-2 mt-2">
                    <p>Customer: {selectedPOD.customerName}</p>
                    <p>Received By: {selectedPOD.podDetails.receivedBy}</p>
                    <p>Driver: {selectedPOD.driver.name}</p>
                    <p>Location: {selectedPOD.location.address}</p>
                    <p>Delivered: {format(new Date(selectedPOD.podDetails.timestamp), 'PPP p')}</p>
                    {selectedPOD.podDetails.notes && (
                      <p>Notes: {selectedPOD.podDetails.notes}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Signature</h3>
                  <div className="border rounded-lg p-4 mt-2 bg-white">
                    <img
                      src={selectedPOD.podDetails.signature}
                      alt="Signature"
                      className="h-20 w-full object-contain"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">POD Image</h3>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div className="h-48">
                    <img
                      src={selectedPOD.podDetails.image}
                      alt="POD"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 