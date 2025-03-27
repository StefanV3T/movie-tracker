'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Supabase client setup
const supabaseUrl = 'https://georzuqfssefsmcunjnu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlb3J6dXFmc3NlZnNtY3Vuam51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMjA5MDcsImV4cCI6MjA1ODU5NjkwN30.qg3vPTBq1_vBGCL2c6QpE53J8HaLPj9TWSrDElRjHgo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the context type
type SupabaseContextType = {
  supabase: SupabaseClient;
  user: User | null;
  loading: boolean;
};

// Create context with a safe default value
const SupabaseContext = createContext<SupabaseContextType>({
  supabase,
  user: null,
  loading: true,
});

// Provider component
export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Check for session on mount
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase, user, loading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Hook to use the context
export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};