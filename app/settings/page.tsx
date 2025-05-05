'use client';

import { Suspense } from 'react';
import { SettingsContent } from '@/components/settings/settings-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SettingsContent />
    </Suspense>
  );
}