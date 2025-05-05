'use client';

import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import dynamic from 'next/dynamic';

// Dynamically import WarehousesPageContent with ssr: false to disable server-side rendering
const WarehousesContent = dynamic(
  () => import('@/components/warehouses/warehouses-content').then((mod) => mod.WarehousesContent), 
  { 
    ssr: false 
  }
);
const WarehouseOperations = dynamic(
  () => import('@/components/warehouses/warehouse-operations').then((mod) => mod.WarehouseOperations), 
  { 
    ssr: false 
  }
);

export default function WarehousesPage() {
  return (
    <div className="space-y-8">
    <Suspense fallback={<LoadingSpinner />}>
      <WarehousesContent />
    </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
     {/* @ts-expect-error jks js */}
        <WarehouseOperations warehouseId={null} />
      </Suspense>
    </div>
  );
}