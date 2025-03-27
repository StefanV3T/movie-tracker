'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/SupabaseProvider';
import WatchHistoryList from '@/components/WatchHistoryList';
import { Movie } from '@/types';

// Tab types
type TabType = 'all' | 'unrated' | 'favorites';

export default function Dashboard() {
  const { supabase, user, loading } = useSupabase();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const router = useRouter();
  
  // New state for enhanced dashboard
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');

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

  // Filter movies based on search, tab and platform filter
  const filteredMovies = movies.filter(movie => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      movie.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Tab filter
    const matchesTab = 
      (activeTab === 'all') ||
      (activeTab === 'unrated' && (!movie.rating || movie.rating === 0)) ||
      (activeTab === 'favorites' && movie.rating && movie.rating >= 4);
    
    // Platform filter
    const matchesPlatform = !platformFilter || movie.platform === platformFilter;
    
    return matchesSearch && matchesTab && matchesPlatform;
  });
  
  // Sort movies based on selected order
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.last_watched || b.watched_at).getTime() - 
             new Date(a.last_watched || a.watched_at).getTime();
    } else if (sortOrder === 'oldest') {
      return new Date(a.watched_at).getTime() - new Date(b.watched_at).getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  // Get platform counts for filter badges
  const platformCounts = movies.reduce((acc, movie) => {
    const platform = movie.platform || 'unknown';
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count unrated movies
  const unratedCount = movies.filter(movie => !movie.rating || movie.rating === 0).length;
  const favoritesCount = movies.filter(movie => movie.rating && movie.rating >= 4).length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-800">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your Watch History</h1>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 hidden md:inline">{user.email}</span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500"
                placeholder="Search titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Sort */}
            <div className="w-full md:w-48">
              <select 
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 rounded-md"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'alphabetical')}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="alphabetical">Sort: A-Z</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All Movies ({movies.length})
              </button>
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'unrated'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('unrated')}
              >
                Not Rated ({unratedCount})
              </button>
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'favorites'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('favorites')}
              >
                Favorites ({favoritesCount})
              </button>
            </nav>
          </div>
          
          {/* Platform filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                platformFilter === null
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setPlatformFilter(null)}
            >
              All Platforms
            </button>
            {Object.entries(platformCounts).map(([platform, count]) => (
              <button
                key={platform}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  platformFilter === platform
                    ? platform === 'netflix' ? 'bg-red-600 text-white' :
                      platform === 'disney' ? 'bg-blue-600 text-white' :
                      platform === 'hbo' ? 'bg-purple-600 text-white' :
                      platform === 'prime' ? 'bg-cyan-500 text-white' :
                      'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setPlatformFilter(platform === platformFilter ? null : platform)}
              >
                {platform === 'netflix' ? 'Netflix' : 
                 platform === 'disney' ? 'Disney+' :
                 platform === 'hbo' ? 'HBO Max' :
                 platform === 'prime' ? 'Prime Video' :
                 platform} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {fetchLoading ? (
          <div className="text-center py-20 bg-white shadow rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Loading your watch history...</p>
          </div>
        ) : sortedMovies.length === 0 ? (
          <div className="text-center py-20 bg-white shadow rounded-lg">
            {searchTerm || platformFilter || activeTab !== 'all' ? (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-700">No movies match your filters</p>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setPlatformFilter(null);
                    setActiveTab('all');
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-700">No watch history found</p>
                <p className="mt-2 text-sm text-gray-500">
                  Start watching content on Netflix, Disney+, HBO Max or Prime Video<br />
                  with the extension installed to see your history here.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {activeTab === 'all' ? 'All Titles' :
                 activeTab === 'unrated' ? 'Unrated Titles' : 'Favorite Titles'}
              </h2>
              <span className="text-sm text-gray-500">
                Showing {sortedMovies.length} of {movies.length} titles
              </span>
            </div>
            <WatchHistoryList movies={sortedMovies} onUpdate={fetchWatchHistory} />
          </div>
        )}
      </main>
    </div>
  );
}