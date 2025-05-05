'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

const courierFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s]*$/, 'Name can only contain letters and spaces'),
  
  image: z.string()
    .url('Please enter a valid image URL')
    .optional()
    .or(z.literal('')),
  
  currentLocation: z.string()
    .min(2, 'Current location is required')
    .max(100, 'Location cannot exceed 100 characters'),
  
  destination: z.string()
    .min(2, 'Destination is required')
    .max(100, 'Destination cannot exceed 100 characters'),
  
  status: z.enum(['active', 'inactive'], {
    required_error: "Please select a status"
  }),
  
  phone: z.string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(15, 'Phone number cannot exceed 15 characters')
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      'Please enter a valid phone number (e.g., +441234567890)'
    ),
  
  vehicle: z.string()
    .min(2, 'Vehicle information is required')
    .max(20, 'Vehicle information cannot exceed 20 characters')
    .regex(
      /^[A-Z0-9\s-]+$/i,
      'Vehicle format: Type - Registration (e.g., Van - AB12 XYZ)'
    ),
});

interface CourierFormProps {
  courier?: any;
  onSubmit: (data: CourierFormData) => void;
  isLoading: boolean;
  defaultValues?: CourierFormData;
}

interface CourierFormData {
  name: string;
  phone: string;
  vehicle: string;
}

export function CourierForm({ courier, onSubmit, isLoading, defaultValues }: CourierFormProps) {
  const [stops, setStops] = useState<string[]>(courier?.stops || []);
  const [newStop, setNewStop] = useState('');

  const form = useForm<z.infer<typeof courierFormSchema>>({
    resolver: zodResolver(courierFormSchema),
    defaultValues: {
      name: courier?.name || '',
      image: courier?.image || '',
      currentLocation: courier?.currentLocation || '',
      destination: courier?.destination || '',
      status: courier?.status || 'active',
      phone: courier?.phone || '',
      vehicle: courier?.vehicle || '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  const handleAddStop = () => {
    if (newStop.trim()) {
      if (stops.length >= 10) {
      // @ts-expect-error jk kj
        form.setError('stops', {
          type: 'manual',
          message: 'Maximum 10 stops allowed'
        });
        return;
      }
      setStops([...stops, newStop.trim()]);
      setNewStop('');
    }
  };

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleSubmit = form.handleSubmit((data) => {
    if (stops.length === 0) {

      // @ts-expect-error jk kj
      form.setError('stops', {
        type: 'manual',
        message: 'At least one stop is required'
      });
      return;
    }

    onSubmit({
      ...data,
      // @ts-expect-error jk kj
      stops,
      coordinates: {
        current: [51.5074, -0.1278],
        destination: [52.4862, -1.8904],
        stops: stops.map(() => [52.0406, -0.7594]),
      },
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={form.watch('image')} alt="Preview" />
              <AvatarFallback>
                {form.watch('name')?.split(' ').map(n => n[0]).join('') || 'CN'}
              </AvatarFallback>
            </Avatar>
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Profile Image URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/image.jpg" 
                      {...field} 
                      disabled={isLoading}
                      className={cn(
                        form.formState.errors.image && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    {...field}
                    className={cn(
                      form.formState.errors.name && "border-red-500 focus-visible:ring-red-500"
                    )}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+441234567890"
                      {...field}
                      className={cn(
                        form.formState.errors.phone && "border-red-500 focus-visible:ring-red-500"
                      )}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Van - AB12 XYZ"
                      {...field}
                      className={cn(
                        form.formState.errors.vehicle && "border-red-500 focus-visible:ring-red-500"
                      )}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger className={cn(
                      form.formState.errors.status && "border-red-500 focus-visible:ring-red-500"
                    )}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currentLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Location</FormLabel>
                <FormControl>
                  <Input placeholder="London, UK" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Stops</FormLabel>
            <div className="flex gap-2">
              <Input
                placeholder="Add a stop"
                value={newStop}
                onChange={(e) => setNewStop(e.target.value)}
                disabled={isLoading || stops.length >= 10}
                className={cn(
      // @ts-expect-error jk kj
                  form.formState.errors.stops && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddStop}
                disabled={isLoading || !newStop.trim() || stops.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
       {/* @ts-expect-error jk kj */}
      {form.formState.errors.stops && (
        <p className="text-sm font-medium text-red-500">
                {/* @ts-expect-error jk kj */}
                {form.formState.errors.stops.message}
              </p>
            )}
            {stops.length >= 10 && (
              <p className="text-sm text-amber-600">
                Maximum number of stops reached (10)
              </p>
            )}
            <div className="space-y-2">
              {stops.map((stop, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-secondary rounded-md">
                    {stop}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStop(index)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Final Destination</FormLabel>
                <FormControl>
                  <Input placeholder="Manchester, UK" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !form.formState.isValid || stops.length === 0}
        >
          {isLoading ? (
            <>
              <LoadingSpinner className="mr-2" />
              {courier ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            courier ? 'Update Courier' : 'Add Courier'
          )}
        </Button>
      </form>
    </Form>
  );
}