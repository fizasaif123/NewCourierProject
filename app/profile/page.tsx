'use client';

import { Suspense } from 'react';
import { ProfileContent } from '@/components/profile/profile-content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileContent />
    </Suspense>
  );
}