'use client';

import { Suspense } from 'react';
import { TrackingContent } from '@/components/couriers/courier-tracking';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function   TrackingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TrackingContent />
    </Suspense>
  );
}