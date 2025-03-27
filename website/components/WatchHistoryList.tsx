'use client';

import { useSupabase } from './SupabaseProvider';
import { useState } from 'react';
import { Movie } from '@/types';

interface WatchHistoryListProps {
  movies: Movie[];
  onUpdate?: () => void;
}

export default function WatchHistoryList({ movies, onUpdate }: WatchHistoryListProps) {
  const { supabase } = useSupabase();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState<{id: string, rating: number} | null>(null);
  const [savingRating, setSavingRating] = useState<string | null>(null);

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
          className={`bg-white rounded-lg shadow-sm border-t border-r border-b overflow-hidden border-gray-200 border-l-4 ${
            movie.platform === 'disney' ? 'border-l-blue-600' :
            movie.platform === 'hbo' ? 'border-l-purple-600' :
            movie.platform === 'prime' ? 'border-l-cyan-500' :
            'border-l-red-600'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium text-gray-900 mr-2">{movie.title}</h3>
              <div className="flex items-center space-x-1">
                {movie.view_count > 1 && (
                  <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {movie.view_count}×
                  </span>
                )}
                
                {/* Platform badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                  ${movie.platform === 'netflix' ? 'bg-red-100 text-red-800' :
                    movie.platform === 'disney' ? 'bg-blue-100 text-blue-800' :
                    movie.platform === 'hbo' ? 'bg-purple-100 text-purple-800' :
                    movie.platform === 'prime' ? 'bg-cyan-100 text-cyan-800' :
                    'bg-gray-100 text-gray-800'}`}
                >
                  {movie.platform === 'netflix' ? 'Netflix' :
                   movie.platform === 'disney' ? 'Disney+' :
                   movie.platform === 'hbo' ? 'HBO Max' :
                   movie.platform === 'prime' ? 'Prime' :
                   movie.platform || 'Unknown'}
                </span>
              </div>
            </div>
            
            {/* Rating Stars */}
            <div className="mt-3 flex items-center">
              <div className="mr-2 text-xs text-gray-700">
                {savingRating === movie.id ? 'Saving...' : 'Rating:'}
              </div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="focus:outline-none"
                    disabled={savingRating === movie.id}
                    onMouseEnter={() => setHoveredRating({id: movie.id, rating: star})}
                    onMouseLeave={() => setHoveredRating(null)}
                    onClick={() => handleRating(movie, star)}
                    aria-label={`Rate ${star} stars`}
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
            
            <div className="mt-2 text-xs text-gray-600">
              <p><span className="font-medium">Last watched:</span> {formatDate(movie.last_watched || movie.watched_at)}</p>
              <p><span className="font-medium">First watched:</span> {formatDate(movie.watched_at)}</p>
            </div>
            
            {/* Actions */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${movie.title}" from your history?`)) {
                    handleDelete(movie.id);
                  }
                }}
                disabled={isDeleting === movie.id}
                className={`text-xs px-2 py-1 rounded ${
                  isDeleting === movie.id 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
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