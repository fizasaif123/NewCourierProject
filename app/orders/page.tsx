'use client';

import { Suspense } from 'react';
import { OrdersContent } from '@/components/orders/orders-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OrdersContent />
    </Suspense>
  );
}