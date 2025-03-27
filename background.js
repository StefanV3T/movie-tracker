const SUPABASE_URL = "https://georzuqfssefsmcunjnu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlb3J6dXFmc3NlZnNtY3Vuam51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMjA5MDcsImV4cCI6MjA1ODU5NjkwN30.qg3vPTBq1_vBGCL2c6QpE53J8HaLPj9TWSrDElRjHgo";

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "save_movie") {
    console.log("Saving movie:", request.title);
    
    // Save to Chrome storage
    chrome.storage.local.get(['watchedMovies', 'authSession'], (result) => {
      const movies = result.watchedMovies || [];
      const now = new Date().toISOString();
      
      // Check if movie already exists
      const existingIndex = movies.findIndex(movie => movie.title === request.title);
      
      if (existingIndex === -1) {
        // New movie - add it
        const newMovie = { 
          title: request.title, 
          timestamp: now,
          viewCount: 1,
          lastWatched: now
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

// Function to sync a new movie to Supabase
function syncMovieToSupabase(movie, authSession) {
  console.log("Syncing new movie to Supabase:", movie.title);
  
  const userId = authSession.user.id;
  
  const movieData = {
    title: movie.title,
    user_id: userId,
    view_count: movie.viewCount || 1,
    watched_at: movie.timestamp, // Match this to your DB column name
    last_watched: movie.lastWatched || movie.timestamp
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
    console.log(`Successfully synced "${movie.title}" to Supabase`);
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
        last_watched: movie.lastWatched
      })
    }
  )
  .then(response => {
    if (!response.ok) {
      throw new Error(`Error updating movie in Supabase: ${response.status}`);
    }
    console.log(`Successfully updated "${movie.title}" in Supabase`);
  })
  .catch(error => {
    console.error("Supabase update error:", error);
  });
}