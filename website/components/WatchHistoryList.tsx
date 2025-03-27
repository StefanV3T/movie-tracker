'use client';

import { useSupabase } from './SupabaseProvider';
import { useEffect, useState } from 'react';
import { Movie } from '@/types';
import Image from 'next/image';

interface WatchHistoryListProps {
  movies: Movie[];
  onUpdate?: () => void;
}

export default function WatchHistoryList({ movies, onUpdate }: WatchHistoryListProps) {
  const { supabase } = useSupabase();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState<{id: string, rating: number} | null>(null);
  const [savingRating, setSavingRating] = useState<string | null>(null);
  const [loadingCovers, setLoadingCovers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadMissingCovers = async () => {
      // Process only 4 movies at a time to avoid too many simultaneous requests
      const moviesWithoutCovers = movies.filter(movie => !movie.cover_url).slice(0, 4);
      
      for (const movie of moviesWithoutCovers) {
        if (loadingCovers[movie.id]) continue; // Skip if already loading
        
        setLoadingCovers(prev => ({ ...prev, [movie.id]: true }));
        
        try {
          const response = await fetch(`/api/movie-covers?id=${movie.id}`);
          const data = await response.json();
          
          if (data.success && data.movie.cover_url) {
            // If onUpdate was provided, call it to refresh the movie data
            if (onUpdate) onUpdate();
          }
        } catch (error) {
          console.error('Error loading cover for movie:', movie.title, error);
        } finally {
          setLoadingCovers(prev => ({ ...prev, [movie.id]: false }));
        }
      }
    };
    
    loadMissingCovers();
  }, [movies])

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  // Handle rating change
  const handleRating = async (movie: Movie, rating: number) => {
    if (savingRating === movie.id) return; // Prevent multiple clicks
    
    setSavingRating(movie.id);
    try {
      console.log(`Setting rating ${rating} for movie ${movie.id}`);
      
      const { error } = await supabase
        .from('watched_movies')
        .update({ rating })
        .eq('id', movie.id);
        
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Rating updated successfully');
      
      // Call the onUpdate callback to refresh data
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      alert('Failed to update rating. Please try again.');
    } finally {
      setSavingRating(null);
    }
  };
  
  // Handle movie deletion
  const handleDelete = async (movieId: string) => {
    setIsDeleting(movieId);
    
    try {
      const { error } = await supabase
        .from('watched_movies')
        .delete()
        .eq('id', movieId);
        
      if (error) throw error;
      
      // Call the onUpdate callback to refresh data
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting movie:', error);
      alert('Failed to delete movie. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {movies.map((movie) => (
        <div 
          key={movie.id} 
          className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full"
        >
          {/* Cover Image Section */}
          <div className="relative w-full h-64 bg-gray-100">
            {movie.cover_url ? (
              <Image
                src={movie.cover_url}
                alt={`${movie.title} poster`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                onError={(e) => {
                  // Fallback to platform placeholder on error
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite error loop
                  target.src = `/images/${movie.platform || 'default'}-placeholder.jpg`;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {loadingCovers[movie.id] ? (
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                    <div className="mt-2 w-24 h-4 bg-gray-300 rounded"></div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center p-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2
                      ${movie.platform === 'netflix' ? 'bg-red-100 text-red-600' :
                       movie.platform === 'disney' ? 'bg-blue-100 text-blue-600' :
                       movie.platform === 'hbo' ? 'bg-purple-100 text-purple-600' :
                       movie.platform === 'prime' ? 'bg-cyan-100 text-cyan-600' :
                       'bg-gray-200 text-gray-600'}`}
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500">No cover available</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Platform badge */}
            <div className="absolute top-2 right-2">
              <span className={`inline-block px-2 py-1 text-xs font-bold text-white rounded-md shadow-sm
                ${movie.platform === 'netflix' ? 'bg-red-600' :
                 movie.platform === 'disney' ? 'bg-blue-600' :
                 movie.platform === 'hbo' ? 'bg-purple-600' :
                 movie.platform === 'prime' ? 'bg-cyan-500' :
                 'bg-gray-600'}`}>
                {movie.platform === 'netflix' ? 'Netflix' :
                 movie.platform === 'disney' ? 'Disney+' :
                 movie.platform === 'hbo' ? 'HBO Max' :
                 movie.platform === 'prime' ? 'Prime' :
                 movie.platform || 'Unknown'}
              </span>
            </div>
            
            {/* Release year badge if available */}
            {movie.release_year && (
              <div className="absolute bottom-2 left-2">
                <span className="bg-black bg-opacity-70 text-white px-2 py-0.5 rounded text-xs shadow">
                  {movie.release_year}
                </span>
              </div>
            )}
          </div>
          
          {/* Card content */}
          <div className="p-4 flex flex-col flex-grow">
            <h3 className="text-lg font-semibold text-gray-900">{movie.title}</h3>
            
            {/* View count badge */}
            {movie.view_count > 1 && (
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  Watched {movie.view_count} times
                </span>
              </div>
            )}
            
            {/* Rating Stars */}
            <div className="mt-4">
              <div className="flex items-center">
                <div className="mr-2 text-sm text-gray-700">
                  {savingRating === movie.id ? 'Saving...' : 'Rating:'}
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="focus:outline-none"
                      disabled={savingRating === movie.id}
                      onMouseEnter={() => setHoveredRating({id: movie.id, rating: star})}
                      onMouseLeave={() => setHoveredRating(null)}
                      onClick={() => handleRating(movie, star)}
                    >
                      <svg
                        className={`w-5 h-5 ${
                          savingRating === movie.id
                            ? 'text-gray-400'
                            : (hoveredRating && hoveredRating.id === movie.id && star <= hoveredRating.rating) ||
                              (!hoveredRating && movie.rating && star <= movie.rating)
                              ? 'text-yellow-500'
                              : 'text-gray-300'
                        } transition-colors`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-600">
              <p><span className="font-medium">Last watched:</span> {formatDate(movie.last_watched || movie.watched_at)}</p>
              <p><span className="font-medium">First watched:</span> {formatDate(movie.watched_at)}</p>
            </div>
            
            {/* Delete button */}
            <div className="mt-auto pt-3 flex justify-end">
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${movie.title}" from your history?`)) {
                    handleDelete(movie.id);
                  }
                }}
                disabled={isDeleting === movie.id}
                className={`text-xs px-2 py-1 rounded ${
                  isDeleting === movie.id 
                    ? 'bg-gray-300 text-gray-500' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
              >
                {isDeleting === movie.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}