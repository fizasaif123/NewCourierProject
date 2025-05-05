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
import { TrainingContent } from './training-content';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function PricingContent() {
  const { toast } = useToast();
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

  const handleRequestQuote = async () => {
    try {
      setIsGeneratingQuote(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: 'Quote Generated',
        content: 'Your custom quote has been sent to your email.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        content: 'Failed to generate quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Pricing & Plans</h1>
        <p className="text-muted-foreground">
          Choose the perfect plan for your business needs
        </p>
      </div>

      {/* Cost Breakdown */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Base System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£10,000</div>
            <p className="text-sm text-muted-foreground">Core WMS functionality</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Portals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£5,000</div>
            <p className="text-sm text-muted-foreground">Portal development & setup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£3,000</div>
            <p className="text-sm text-muted-foreground">API/EDI connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£1,000</div>
            <p className="text-sm text-muted-foreground">Monthly maintenance</p>
          </CardContent>
        </Card>
      </div>

      {/* Request Quote Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleRequestQuote}
          disabled={isGeneratingQuote}
        >
          {isGeneratingQuote ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Quote...
            </>
          ) : (
            'Request Full Quote'
          )}
        </Button>
      </div>

      {/* Training & Support Section */}
      <div className="mt-12 border-t pt-12">
        <TrainingContent />
      </div>
    </div>
  );
}