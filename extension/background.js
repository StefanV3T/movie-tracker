const SUPABASE_URL = "https://georzuqfssefsmcunjnu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlb3J6dXFmc3NlZnNtY3Vuam51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMjA5MDcsImV4cCI6MjA1ODU5NjkwN30.qg3vPTBq1_vBGCL2c6QpE53J8HaLPj9TWSrDElRjHgo";
const TMDB_API_KEY = "0ac91211842d2db88c5715d0c0518458";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "save_movie") {
    console.log("Saving movie:", request.title);
    
    // Save to Chrome storage
    chrome.storage.local.get(['watchedMovies', 'authSession'], async (result) => {
      const movies = result.watchedMovies || [];
      const now = new Date().toISOString();
      
      // Check if movie already exists
      const existingIndex = movies.findIndex(movie => 
        movie.title === request.title && movie.platform === request.platform
      );
      
      // Search for cover image using TMDb
      const tmdbData = await searchTMDbForContent(request.title);

      const movieUrl = request.movieUrl || sender.url;
      
      if (existingIndex === -1) {
        // New movie - add it
        const newMovie = { 
          title: request.title, 
          timestamp: now,
          viewCount: 1,
          lastWatched: now,
          platform: request.platform || 'netflix',
          coverUrl: tmdbData.coverUrl,
          releaseYear: tmdbData.releaseYear,
          movieUrl: movieUrl
        };
        
        movies.push(newMovie);
        
        chrome.storage.local.set({ watchedMovies: movies }, () => {
          console.log(`Movie "${request.title}" saved to Chrome storage.`);
          
          // If user is logged in, sync to Supabase
          if (result.authSession) {
            syncMovieToSupabase(newMovie, result.authSession);
          }
          
          sendResponse({ success: true, newEntry: true });
        });
      } else {
        // Existing movie - update timestamp and view count
        const existingMovie = movies[existingIndex];
        existingMovie.viewCount = (existingMovie.viewCount || 1) + 1;
        existingMovie.lastWatched = now;
        
        // Update cover URL if it was missing before
        if (!existingMovie.coverUrl && tmdbData.coverUrl) {
          existingMovie.coverUrl = tmdbData.coverUrl;
          existingMovie.releaseYear = tmdbData.releaseYear;
        }
        
        existingMovie.movieUrl = movieUrl;

        chrome.storage.local.set({ watchedMovies: movies }, () => {
          console.log(`Movie "${request.title}" view count updated to ${existingMovie.viewCount}`);
          
          // If user is logged in, update in Supabase
          if (result.authSession) {
            updateMovieInSupabase(existingMovie, result.authSession);
          }
          
          sendResponse({ success: true, newEntry: false, viewCount: existingMovie.viewCount });
        });
      }
    });
    
    return true; // Keep the messaging channel open for async responses
  }
});

// Function to search TMDb for movie/show data
async function searchTMDbForContent(title) {
  try {
    // Clean title to improve search results (for TV episodes)
    const cleanedTitle = cleanTitle(title);
    
    // First try to search for movies
    const movieResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}&page=1`
    );
    
    const movieData = await movieResponse.json();
    
    // If we found a movie match
    if (movieData.results && movieData.results.length > 0) {
      const movie = movieData.results[0];
      return {
        coverUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
        releaseYear: movie.release_date ? movie.release_date.substring(0, 4) : null
      };
    }
    
    // If no movie match, try TV shows
    const tvResponse = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}&page=1`
    );
    
    const tvData = await tvResponse.json();
    
    // If we found a TV show match
    if (tvData.results && tvData.results.length > 0) {
      const show = tvData.results[0];
      return {
        coverUrl: show.poster_path ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}` : null,
        releaseYear: show.first_air_date ? show.first_air_date.substring(0, 4) : null
      };
    }
    
    // If nothing found with cleaned title, try the original title as a fallback
    if (cleanedTitle !== title) {
      const fallbackResponse = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&page=1`
      );
      
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData.results && fallbackData.results.length > 0) {
        const result = fallbackData.results[0];
        if (result.media_type === 'movie' || result.media_type === 'tv') {
          return {
            coverUrl: result.poster_path ? `${TMDB_IMAGE_BASE_URL}${result.poster_path}` : null,
            releaseYear: result.release_date || result.first_air_date 
              ? (result.release_date || result.first_air_date).substring(0, 4) 
              : null
          };
        }
      }
    }
    
    // No matches found
    return { coverUrl: null, releaseYear: null };
    
  } catch (error) {
    console.error('Error searching TMDb:', error);
    return { coverUrl: null, releaseYear: null };
  }
}

// Function to clean title and extract show name from episode titles
function cleanTitle(title) {
  // Original title for logging
  const originalTitle = title;
  
  // Common patterns that indicate episode information
  const patterns = [
    /A\d+/,               // Matches A1, A2, A4, etc.
    /S\d+E\d+/i,          // Matches S01E01, s1e2, etc.
    /Season \d+/i,        // Matches "Season 1", "Season 2", etc.
    /Episode \d+/i,       // Matches "Episode 1", "Episode 12", etc.
    /Aflevering \d+/i,    // Matches "Aflevering 1" (Dutch), etc.
    /Chapter \d+/i,       // Matches "Chapter 1", etc.
    /Part \d+/i,          // Matches "Part 1", "Part II", etc.
  ];
  
  // Try each pattern and cut off the title at the first match
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match.index !== undefined) {
      title = title.substring(0, match.index).trim();
    }
  }
  
  // Remove common suffixes that might remain
  title = title.replace(/\s*[-:]\s*$/, '');
  
  // Log if we made changes to help debug
  if (title !== originalTitle) {
    console.log(`Cleaned title: "${originalTitle}" → "${title}"`);
  }
  
  return title;
}

// Function to sync a new movie to Supabase
function syncMovieToSupabase(movie, authSession) {
  console.log("Syncing new movie to Supabase:", movie.title);
  
  const userId = authSession.user.id;
  
  const movieData = {
    title: movie.title,
    user_id: userId,
    view_count: movie.viewCount || 1,
    watched_at: movie.timestamp,
    last_watched: movie.lastWatched || movie.timestamp,
    platform: movie.platform || 'netflix',
    cover_url: movie.coverUrl || null,
    release_year: movie.releaseYear || null,
    movie_url: movie.movieUrl || null
  };
  
  fetch(
    `${SUPABASE_URL}/rest/v1/watched_movies`, 
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify([movieData])
    }
  )
  .then(response => {
    if (!response.ok) {
      throw new Error(`Error syncing to Supabase: ${response.status}`);
    }
    console.log(`Successfully synced "${movie.title}" to Supabase with cover: ${movie.coverUrl ? 'yes' : 'no'}`);
  })
  .catch(error => {
    console.error("Supabase sync error:", error);
  });
}

// Function to update an existing movie in Supabase
function updateMovieInSupabase(movie, authSession) {
  console.log("Updating movie in Supabase:", movie.title);
  
  const userId = authSession.user.id;
  
  fetch(
    `${SUPABASE_URL}/rest/v1/watched_movies?title=eq.${encodeURIComponent(movie.title)}&user_id=eq.${userId}`, 
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        view_count: movie.viewCount || 1,
        last_watched: movie.lastWatched,
        cover_url: movie.coverUrl || null,
        release_year: movie.releaseYear || null,
        movie_url: movie.movieUrl || null
      })
    }
  )
  .then(response => {
    if (!response.ok) {
      throw new Error(`Error updating movie in Supabase: ${response.status}`);
    }
    console.log(`Successfully updated "${movie.title}" in Supabase with cover: ${movie.coverUrl ? 'yes' : 'no'}`);
  })
  .catch(error => {
    console.error("Supabase update error:", error);
  });
}