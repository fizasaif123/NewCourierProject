'use client';  // Ensures that this file is client-only

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Dynamically import CouriersContent with SSR disabled and provide the correct type
const CouriersContent = dynamic(
  () => import('@/components/couriers/couriers-content').then((mod) => mod.CouriersContent), 
  { 
    ssr: false 
  }
);

export default function CouriersPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CouriersContent />
    </Suspense>
  );
}
