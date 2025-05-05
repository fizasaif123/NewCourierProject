'use client';

import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import dynamic from 'next/dynamic';

// Dynamically import WarehousesPageContent with ssr: false to disable server-side rendering
const WarehousesPageContent = dynamic(
  () => import('./warehouses-content'), 
  { 
    ssr: false 
  }
);

export default function WareHousePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <WarehousesPageContent />
    </Suspense>
  );
}
