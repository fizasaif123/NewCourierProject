'use client';

import { Suspense } from 'react';
import { InventoryContent } from '@/components/inventory/inventory-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function InventoryPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <InventoryContent />
    </Suspense>
  );
}