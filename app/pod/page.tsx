'use client';

import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import dynamic from 'next/dynamic';

const PODManagementContent = dynamic(
  () => import('@/components/pod/pod-management-content').then((mod) => mod.PODManagementContent), 
  { 
    ssr: false 
  }
);

export default function PODPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PODManagementContent />
    </Suspense>
  );
} 