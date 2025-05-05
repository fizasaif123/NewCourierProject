import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
// import { TimePicker } from "@/components/ui/time-picker";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, X, Trash } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Badge
} from "@/components/ui/badge";
import {
  Input
} from "@/components/ui/input";
import {
  Textarea
} from "@/components/ui/textarea";
import {
  Label
} from "@/components/ui/label";
import { LoadingSpinner } from "../ui/loading-spinner";

// Define the stop interface
interface RouteStop {
  id: string;
  location: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  notes: string;
  timeWindow: {
    start: string;
    end: string;
  };
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

const assignCourierSchema = z.object({
  courierId: z.string({
    required_error: "Please select a courier",
  }),
  sourceLocation: z.string({
    required_error: "Source location is required",
  }),
  destinationLocation: z.string({
    required_error: "Destination location is required",
  }),
  stops: z.array(z.object({
    id: z.string(),
    location: z.string().min(1, "Location is required"),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    notes: z.string(),
    timeWindow: z.object({
      start: z.string(),
      end: z.string(),
    }),
    items: z.array(z.object({
      name: z.string().min(1, "Item name is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
    })).min(1, "At least one item is required"),
  })).optional(),
});

export function AssignCourierForm({ onSubmit, isLoading }: any) {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [editingStop, setEditingStop] = useState<RouteStop | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);

  const form = useForm<z.infer<typeof assignCourierSchema>>({
    resolver: zodResolver(assignCourierSchema),
  });

  const handleAddStop = (stopData: RouteStop) => {
    if (editingStop) {
      setStops(stops.map(stop => 
        stop.id === editingStop.id ? stopData : stop
      ));
    } else {
      setStops([...stops, { ...stopData, id: crypto.randomUUID() }]);
    }
    setShowStopDialog(false);
    setEditingStop(null);
  };

  const handleEditStop = (stop: RouteStop) => {
    setEditingStop(stop);
    setShowStopDialog(true);
  };

  const handleDeleteStop = (stopId: string) => {
    setStops(stops.filter(stop => stop.id !== stopId));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="courierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Courier</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a courier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* @ts-expect-error hj kj */}
                  {couriers.map((courier) => (
                    <SelectItem key={courier.id} value={courier.id}>
                      {courier.name} - {courier.vehicle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sourceLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Location</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} placeholder="Enter source location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="destinationLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination Location</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} placeholder="Enter destination location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Stops Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Route Stops</h3>
            <Button
              type="button"
              onClick={() => setShowStopDialog(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stop
            </Button>
          </div>

          <div className="space-y-4">
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className="border rounded-lg p-4 space-y-3 bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{index + 1}.</span>
                      <span>{stop.location}</span>
                      <Badge variant={
                        stop.priority === 'HIGH' ? 'destructive' :
                        stop.priority === 'MEDIUM' ? 'default' : 'secondary'
                      }>
                        {stop.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{stop.notes}</p>
                    <p className="text-sm">
                      {stop.timeWindow.start} - {stop.timeWindow.end}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditStop(stop)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteStop(stop.id)}
                      className="text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Items:</h4>
                  <div className="space-y-1">
                    {stop.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="text-sm">
                        {item.name} × {item.quantity}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <LoadingSpinner className="mr-2" />
              Assigning...
            </>
          ) : (
            'Assign Courier'
          )}
        </Button>
      </form>

      {/* Stop Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStop ? 'Edit Stop' : 'Add Stop'}
            </DialogTitle>
          </DialogHeader>
          <StopForm
            onSubmit={handleAddStop}
            defaultValues={editingStop}
            onCancel={() => {
              setShowStopDialog(false);
              setEditingStop(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </Form>
  );
}

// Add this component in the same file or create a new one
function StopForm({ onSubmit, defaultValues, onCancel }:any) {
  const [items, setItems] = useState(defaultValues?.items || [{ name: '', quantity: 1 }]);
  const [location, setLocation] = useState(defaultValues?.location || '');
  const [priority, setPriority] = useState(defaultValues?.priority || 'MEDIUM');
  const [notes, setNotes] = useState(defaultValues?.notes || '');
  const [timeWindow, setTimeWindow] = useState(defaultValues?.timeWindow || {
    start: '09:00',
    end: '17:00'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: defaultValues?.id || '',
      location,
      priority,
      notes,
      timeWindow,
      items: items.filter((item:any) => item.name.trim() !== ''),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter stop location"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Priority</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Time Window</Label>
        <div className="flex gap-4">
          <div className="flex-1">
            {/* <TimePicker
              value={timeWindow.start}
              onChange={(time:any) => setTimeWindow({ ...timeWindow, start: time })}
            /> */}
          </div>
          <div className="flex-1">
            {/* <TimePicker
              value={timeWindow.end}
              onChange={(time:any) => setTimeWindow({ ...timeWindow, end: time })}
            /> */}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any special instructions"
        />
      </div>

      <div className="space-y-2">
        <Label>Items</Label>
        {items.map((item:any, index:any) => (
          <div key={index} className="flex gap-2">
            <Input
              className="flex-1"
              value={item.name}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].name = e.target.value;
                setItems(newItems);
              }}
              placeholder="Item name"
            />
            <Input
              type="number"
              className="w-24"
              value={item.quantity}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].quantity = parseInt(e.target.value) || 1;
                setItems(newItems);
              }}
              min="1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setItems(items.filter((_:any, i:any) => i !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setItems([...items, { name: '', quantity: 1 }])}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {defaultValues ? 'Update Stop' : 'Add Stop'}
        </Button>
      </div>
    </form>
  );
}