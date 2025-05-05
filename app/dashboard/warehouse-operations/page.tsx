'use client';

import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import dynamic from 'next/dynamic';


const WarehouseOperations = dynamic(
  () => import('@/components/warehouses/warehouse-operations').then((mod) => mod.WarehouseOperations), 
  { 
    ssr: false 
  }
);

export default function WarehouseOperationsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Warehouse Operations</h1>
      </div>
      <Suspense fallback={<LoadingSpinner />}>
      {/* @ts-expect-error jl lk */}
        <WarehouseOperations warehouseId={null} />
      </Suspense>
    </div>
  );
} 

