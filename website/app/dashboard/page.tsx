'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/SupabaseProvider';
import WatchHistoryList from '@/components/WatchHistoryList';
import { Movie } from '@/types';

export default function Dashboard() {
  const { supabase, user, loading } = useSupabase();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Function to fetch watch history
  const fetchWatchHistory = async () => {
    if (user) {
      try {
        setFetchLoading(true);
        const { data, error } = await supabase
          .from('watched_movies')
          .select('*')
          .eq('user_id', user.id)
          .order('last_watched', { ascending: false });

        if (error) throw error;
        setMovies(data || []);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setFetchLoading(false);
      }
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchWatchHistory();
    }
  }, [user]);

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-800">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Your Watch History</h1>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{user.email}</span>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {fetchLoading ? (
          <div className="text-center py-8 text-gray-700">Loading your watch history...</div>
        ) : (
          <WatchHistoryList movies={movies} onUpdate={fetchWatchHistory} />
        )}
      </main>
    </div>
  );
}