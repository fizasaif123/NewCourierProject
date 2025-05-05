'use client';

import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StockContent } from '@/components/inventory/inventory-management';

export default function StockPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StockContent/>
    </Suspense>
  );
}