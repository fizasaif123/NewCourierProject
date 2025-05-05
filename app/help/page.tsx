'use client';

import { Suspense } from 'react';
import { HelpContent } from '@/components/help/help-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HelpPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HelpContent />
    </Suspense>
  );
}