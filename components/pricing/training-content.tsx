'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Loader2, 
  BookOpen, 
  Video, 
  Users, 
  MessageSquare, 
  HelpCircle,
  ChevronRight,
  Send
} from 'lucide-react';

const feedbackFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email'),
  category: z.string().min(1, 'Please select a category'),
  message: z.string().min(10, 'Please provide more details'),
});

export function TrainingContent() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  const form = useForm<z.infer<typeof feedbackFormSchema>>({
    resolver: zodResolver(feedbackFormSchema),
  });

  const onSubmit = async (data: z.infer<typeof feedbackFormSchema>) => {
    try {
      setIsSubmitting(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Feedback Submitted',
        content: 'Thank you for your feedback. We will review it shortly.',
      });
      setShowFeedbackDialog(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        content: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Training & Support</h2>
        <p className="text-muted-foreground">
          Comprehensive resources to help you succeed with our platform
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Documentation */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent dark:from-indigo-950 dark:to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-indigo-600" />
                Detailed user guides
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-indigo-600" />
                API documentation
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-indigo-600" />
                Best practices
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-indigo-600" />
                Implementation guides
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              View Documentation
            </Button>
          </CardContent>
        </Card>

        {/* Video Tutorials */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-transparent dark:from-rose-950 dark:to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-rose-600" />
              Video Tutorials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-rose-600" />
                Getting started guides
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-rose-600" />
                Feature walkthroughs
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-rose-600" />
                Advanced tutorials
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-rose-600" />
                Tips & tricks
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Watch Tutorials
            </Button>
          </CardContent>
        </Card>

        {/* Live Training */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950 dark:to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Live Training
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-emerald-600" />
                Weekly webinars
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-emerald-600" />
                Custom training sessions
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-emerald-600" />
                Q&A sessions
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-emerald-600" />
                Certification program
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Schedule Training
            </Button>
          </CardContent>
        </Card>

        {/* Support Channels */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-transparent dark:from-cyan-950 dark:to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyan-600" />
              Support Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-cyan-600" />
                24/7 email support
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-cyan-600" />
                Live chat assistance
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-cyan-600" />
                Priority phone support
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-cyan-600" />
                Dedicated account manager
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Contact Support
            </Button>
          </CardContent>
        </Card>

        {/* In-App Guidance */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-transparent dark:from-violet-950 dark:to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-violet-600" />
              In-App Guidance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-violet-600" />
                Interactive tutorials
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-violet-600" />
                Contextual help
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-violet-600" />
                Feature tooltips
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-violet-600" />
                Guided workflows
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Try Demo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Form */}
      <div className="flex justify-center pt-6">
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Send className="h-4 w-4" />
              Submit Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Feedback</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="training">Training Request</SelectItem>
                          <SelectItem value="documentation">Documentation Feedback</SelectItem>
                          <SelectItem value="support">Support Issue</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your feedback or request"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}