'use client';

import { Suspense } from 'react';
import { ProductsContent } from '@/components/products/products-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProductsContent />
    </Suspense>
  );
}