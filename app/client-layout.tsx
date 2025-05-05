'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth/SupabaseClient';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkInitialRoute = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If we're at the root path and user is logged in, redirect to dashboard
      if (window.location.pathname === '/') {
        if (session) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      }
    };

    checkInitialRoute();
  }, []);

  return <>{children}</>;
} 