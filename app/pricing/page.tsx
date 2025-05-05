'use client';

import { Suspense } from 'react';
import { PricingContent } from '@/components/pricing/pricing-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function PricingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PricingContent />
    </Suspense>
  );
}