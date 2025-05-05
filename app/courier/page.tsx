'use client';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const CourierDashboardContent = dynamic(
  () => import('./content').then((mod) => mod.default), 
  { 
    ssr: false 
  }
);

export default function CourierDashboard() {
  return (
    <Suspense fallback={<LoadingSpinner/>}>
      <CourierDashboardContent />
    </Suspense>
  );
}