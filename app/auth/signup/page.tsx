'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { toast } from 'sonner';
import { Lock, Mail, User, Phone, Truck, MapPin } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Initialize Supabase client
const supabaseUrl = "https://qpkaklmbiwitlroykjim.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa2FrbG1iaXdpdGxyb3lramltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgxMzg2MiwiZXhwIjoyMDUyMzg5ODYyfQ.IBTdBXb3hjobEUDeMGRNbRKZoavL0Bvgpyoxb1HHr34";

const supabase = createClient(supabaseUrl, supabaseKey);

const clientFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  company: z.string().min(2, 'Company name must be at least 2 characters'),
});

const courierFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  vehicle_type: z.string().min(2, 'Please specify vehicle type'),
  vehicle_registration: z.string().min(2, 'Please enter vehicle registration'),
  assigned_region: z.string().min(2, 'Please specify your preferred region'),
});

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState(searchParams.get('type') || 'client');

  const clientForm = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      email: '',
      password: '',
      company: '',
    },
  });

  const courierForm = useForm<z.infer<typeof courierFormSchema>>({
    resolver: zodResolver(courierFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      vehicle_type: '',
      vehicle_registration: '',
      assigned_region: '',
    },
  });

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'client' || type === 'courier') {
      setUserType(type);
    }
  }, [searchParams]);

  async function onClientSubmit(values: z.infer<typeof clientFormSchema>) {
    try {
      setIsLoading(true);
      
      // Check if client already exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select()
        .eq('email', values.email)
        .single();

      if (existingClient) {
        throw new Error('An account with this email already exists');
      }

      // Insert new client
      const { error } = await supabase
        .from('clients')
        .insert([
          { 
            email: values.email,
            password: values.password,
            company: values.company,
            status: 'active',
          }
        ]);

      if (error) throw error;

      toast.success('Account created successfully');
      router.push('/auth/login?type=client');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  }

  async function onCourierSubmit(values: z.infer<typeof courierFormSchema>) {
    try {
      setIsLoading(true);
      
      // Check if courier already exists
      const { data: existingCourier } = await supabase
        .from('couriers')
        .select()
        .eq('email', values.email)
        .single();

      if (existingCourier) {
        throw new Error('An account with this email already exists');
      }

      // Insert new courier application
      const { error } = await supabase
        .from('courier_applications')
        .insert([
          { 
            name: values.name,
            email: values.email,
            password: values.password,
            phone: values.phone,
            vehicle_type: values.vehicle_type,
            vehicle_registration: values.vehicle_registration,
            assigned_region: values.assigned_region,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      toast.success('Application submitted successfully');
      router.push('/auth/login?type=courier');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{userType === 'client' ? 'Create Client Account' : 'Apply as Courier'}</CardTitle>
          <CardDescription>
            {userType === 'client' 
              ? 'Enter your details to create a client account'
              : 'Fill in your details to apply as a courier'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userType === 'client' ? (
            <Form {...clientForm}>
              <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-4">
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="john@example.com" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <div className="relative">
                        <Truck className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="Your Company" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...courierForm}>
              <form onSubmit={courierForm.handleSubmit(onCourierSubmit)} className="space-y-4">
                <FormField
                  control={courierForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="John Doe" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={courierForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="john@example.com" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={courierForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={courierForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="+1234567890" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={courierForm.control}
                  name="vehicle_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <div className="relative">
                        <Truck className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="e.g. Car, Bike, Van" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={courierForm.control}
                  name="vehicle_registration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Registration</FormLabel>
                      <div className="relative">
                        <Truck className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="e.g. ABC-123" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={courierForm.control}
                  name="assigned_region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Region</FormLabel>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="e.g. North, South, Central" className="pl-10" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Submitting application...' : 'Submit Application'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link 
              href={`/auth/login?type=${userType}`}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
          <div className="text-sm text-center">
            
            <Link 
              href={`/auth/signup?type=${userType === 'client' ? 'courier' : 'client'}`}
              className="text-primary hover:underline font-medium"
            >
             
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}


const SignUpPage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <SignUpContent />
  </Suspense>
);

export default SignUpPage;