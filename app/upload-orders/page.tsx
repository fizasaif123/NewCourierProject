'use client';

import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { OrdersUploadContent } from '@/components/orders/orders-upload';

export default function OrdersUploadPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OrdersUploadContent/>
    </Suspense>
  );
}