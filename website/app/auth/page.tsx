'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/SupabaseProvider';

export default function AuthPage() {
  const { supabase, user, loading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Streaming Watch Tracker</h1>
          <p className="mt-2 text-gray-600">Sign in to see your watch history</p>
        </div>
        
        <div className="mt-8">
          {!user && !loading && (
            <Auth
              supabaseClient={supabase}
              appearance={{ 
                theme: ThemeSupa,
                // Override the default theme to ensure text visibility
                variables: {
                  default: {
                    colors: {
                      brand: '#e50914',
                      brandAccent: '#831010',
                      inputText: 'black',
                      inputLabelText: 'darkgray',
                      inputPlaceholder: 'gray',
                      messageText: 'gray',
                    },
                  },
                },
              }}
              providers={['google', 'github']}
              redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`}
              theme="light" // Changed to light for better contrast
            />
          )}
          {loading && <div className="text-center text-gray-700">Loading...</div>}
        </div>
      </div>
    </div>
  );
}