'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const session = localStorage.getItem('supabase.auth.token');
    
    if (session) {
      const parsedSession = JSON.parse(session);
      if (parsedSession?.user) {
        setUser({
          id: parsedSession.user.id,
          email: parsedSession.user.email
        });
      }
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!
        });
        // Store session
        localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!
        });
        // Update stored session
        localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      } else {
        setUser(null);
        localStorage.removeItem('supabase.auth.token');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
} 