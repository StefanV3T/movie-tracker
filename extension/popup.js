console.log("Popup script loaded");

const SUPABASE_URL = "https://georzuqfssefsmcunjnu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlb3J6dXFmc3NlZnNtY3Vuam51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMjA5MDcsImV4cCI6MjA1ODU5NjkwN30.qg3vPTBq1_vBGCL2c6QpE53J8HaLPj9TWSrDElRjHgo";

// On popup load, check auth and display movies
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM content loaded");
  
  try {
    // Check authentication status
    chrome.storage.local.get(['authSession'], async (result) => {
      console.log("Auth session check result:", result);
      
      if (!result.authSession) {
        console.log("No auth session found, redirecting to login");
        window.location.href = 'login.html';
        return;
      }
      
      console.log("Auth session found:", result.authSession.user.email);
      
      // Add logout button and user info
      setupUI(result.authSession);
      
      try {
        // First fetch data from Supabase and merge with local data
        console.log("Starting Supabase data fetch");
        await fetchAndMergeSupabaseData(result.authSession);
        console.log("Supabase data fetch complete");
        
        // Then display the merged data
        displayLocalMovies();
        
        // Set up clear button
        document.getElementById("clear").addEventListener("click", () => {
          clearWatchedList(result.authSession);
        });
      } catch (error) {
        console.error("Error in popup initialization:", error);
        // Fall back to showing local data only
        displayLocalMovies();
      }
    });
  } catch (error) {
    console.error("Critical error in popup initialization:", error);
  }
});

// Setup UI elements
function setupUI(authSession) {
  try {
    const header = document.querySelector('h2');
    
    // Add logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.marginLeft = '10px';
    logoutBtn.style.fontSize = '12px';
    logoutBtn.style.padding = '3px 8px';
    logoutBtn.style.float = 'right';
    header.appendChild(logoutBtn);
    
    logoutBtn.addEventListener('click', () => {
      chrome.storage.local.remove(['authSession'], () => {
        window.location.href = 'login.html';
      });
    });
    
    // Show username if available
    if (authSession.user && authSession.user.email) {
      const userSpan = document.createElement('span');
      userSpan.textContent = authSession.user.email;
      userSpan.style.fontSize = '12px';
      userSpan.style.display = 'block';
      userSpan.style.marginTop = '5px';
      userSpan.style.color = '#888';
      header.after(userSpan);
    }
  } catch (error) {
    console.error("Error setting up UI:", error);
  }
}

// Fetch data from Supabase and merge with local storage
async function fetchAndMergeSupabaseData(authSession) {
  try {
    console.log("Fetching movies from Supabase...");
    const userId = authSession.user.id;
    
    // First check if the token is valid with a simple test call
    const testResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/watched_movies?limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${authSession.access_token}`
        }
      }
    );
    
    if (!testResponse.ok) {
      console.error("Test API call failed:", await testResponse.text());
      throw new Error("Authentication appears invalid");
    }
    
    // Fetch movies from Supabase for this user
    console.log("Fetching movies for user ID:", userId);
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/watched_movies?user_id=eq.${userId}&select=*`, 
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching movies: ${response.status}`, errorText);
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const supabaseMovies = await response.json();
    console.log(`Movies from Supabase: ${supabaseMovies.length}`, supabaseMovies);
    
    // Get local movies
    chrome.storage.local.get(['watchedMovies'], (result) => {
      const localMovies = result.watchedMovies || [];
      console.log("Local movies:", localMovies);
      
      // Create a map of existing local movies by title for quick lookup
      const localMoviesMap = {};
      localMovies.forEach(movie => {
        localMoviesMap[movie.title] = movie;
      });
      
      // Process each Supabase movie
      let hasChanges = false;
      supabaseMovies.forEach(supabaseMovie => {
        // Skip invalid entries
        if (!supabaseMovie.title) return;
        
        // If the movie exists locally, update view count if needed
        if (localMoviesMap[supabaseMovie.title]) {
          const localMovie = localMoviesMap[supabaseMovie.title];
          
          // If Supabase has a higher view count or newer timestamp, update local
          if ((supabaseMovie.view_count && supabaseMovie.view_count > (localMovie.viewCount || 1)) || 
              (supabaseMovie.last_watched && new Date(supabaseMovie.last_watched) > new Date(localMovie.lastWatched || localMovie.timestamp))) {
            localMovie.viewCount = supabaseMovie.view_count || localMovie.viewCount || 1;
            localMovie.lastWatched = supabaseMovie.last_watched || localMovie.lastWatched || localMovie.timestamp;
            
            if (localMovie.platform) {
              localMovie.platform = supabaseMovie.platform;
            }
            
            hasChanges = true;
            console.log(`Updated local movie: ${supabaseMovie.title}`);
          }
        } else {
          // Movie doesn't exist locally, add it
          localMovies.push({
            title: supabaseMovie.title,
            timestamp: supabaseMovie.watched_at || new Date().toISOString(),
            viewCount: supabaseMovie.view_count || 1,
            lastWatched: supabaseMovie.last_watched || supabaseMovie.watched_at || new Date().toISOString(),
            platform: supabaseMovie.platform || 'netflix'
          });
          hasChanges = true;
          console.log(`Added new local movie: ${supabaseMovie.title} (${supabaseMovie.platform || 'netflix'})`);
        }
      });
      
      if (hasChanges) {
        console.log("Updating local storage with merged movies:", localMovies);
        chrome.storage.local.set({ watchedMovies: localMovies }, () => {
          console.log("Local storage updated with Supabase data");
          // Re-display the movies
          displayLocalMovies();
        });
      } else {
        console.log("No changes needed to local storage");
      }
    });
  } catch (error) {
    console.error("Error fetching Supabase data:", error);
    throw error; // Re-throw to be caught by caller
  }
}

function displayLocalMovies() {
  try {
    chrome.storage.local.get(['watchedMovies'], (result) => {
      const movies = result.watchedMovies || [];
      console.log(`Displaying ${movies.length} movies`);
      
      const movieList = document.getElementById("movie-list");
      if (!movieList) {
        console.error("Movie list element not found");
        return;
      }
      
      movieList.innerHTML = "";
      
      if (movies.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No movies watched yet";
        li.style.fontStyle = "italic";
        li.style.color = "#888";
        movieList.appendChild(li);
        return;
      }
      
      // Sort movies by timestamp (newest first)
      movies.sort((a, b) => {
        // Use lastWatched if available, otherwise timestamp
        const dateA = a.lastWatched ? new Date(a.lastWatched) : new Date(a.timestamp || 0);
        const dateB = b.lastWatched ? new Date(b.lastWatched) : new Date(b.timestamp || 0);
        return dateB - dateA;
      });

      const moviesToDisplay = movies.slice(0, 4)
      const hasMoreMovies = movies.length > 4;
      
      moviesToDisplay.forEach((movie) => {
        const li = document.createElement("li");
        
        // Add platform indicator
        if (movie.platform) {
          li.classList.add(`platform-${movie.platform}`);
          li.setAttribute('data-platform', movie.platform);
        }
        
        // Create title element
        const titleSpan = document.createElement("span");
        titleSpan.textContent = movie.title;
        li.appendChild(titleSpan);
        
        // Add view count if available
        if (movie.viewCount && movie.viewCount > 1) {
          const countBadge = document.createElement("span");
          countBadge.textContent = `${movie.viewCount} times`;
          countBadge.style.fontSize = "11px";
          countBadge.style.backgroundColor = "#e50914";
          countBadge.style.color = "white";
          countBadge.style.padding = "1px 5px";
          countBadge.style.borderRadius = "10px";
          countBadge.style.marginLeft = "7px";
          titleSpan.appendChild(countBadge);
        }
        
        // Add platform badge
        const platformBadge = document.createElement("span");
        let platformText, platformColor;
        
        switch(movie.platform) {
          case 'disney':
            platformText = 'Disney+';
            platformColor = '#0063e5';
            break;
          case 'hbo':
            platformText = 'HBO Max';
            platformColor = '#5822b4'; // HBO's purple color
            break;
          case 'prime':
            platformText = 'Prime';
            platformColor = '#00A8E1'; // Amazon Prime blue color
            break;
          default: // netflix
            platformText = 'Netflix';
            platformColor = '#e50914';
        }
        
        platformBadge.textContent = platformText;
        platformBadge.style.fontSize = "10px";
        platformBadge.style.backgroundColor = platformColor;
        platformBadge.style.color = "white";
        platformBadge.style.padding = "1px 5px";
        platformBadge.style.borderRadius = "10px";
        platformBadge.style.marginLeft = "7px";
        platformBadge.style.verticalAlign = "middle";
        titleSpan.appendChild(platformBadge);
        
        // Add timestamp if available
        const timestamp = movie.lastWatched || movie.timestamp;
        if (timestamp) {
          const date = new Date(timestamp);
          const timeSpan = document.createElement("span");
          timeSpan.textContent = date.toLocaleString();
          timeSpan.style.fontSize = "11px";
          timeSpan.style.color = "#888";
          li.appendChild(document.createElement("br"));
          li.appendChild(timeSpan);
        }
        
        movieList.appendChild(li);
      });

      if (hasMoreMovies) {
        const viewAllItem = document.createElement("li");
        viewAllItem.className = "view-all-item";
        viewAllItem.style.textAlign = "center";
        viewAllItem.style.padding = "8px";
        viewAllItem.style.marginTop = "10px";
        viewAllItem.style.backgroundColor = "#f5f5f5";
        viewAllItem.style.borderRadius = "4px";
        viewAllItem.style.cursor = "pointer";
        
        const viewAllLink = document.createElement("a");
        viewAllLink.textContent = `View all ${movies.length} movies`;
        viewAllLink.href = "http://localhost:3000/dashboard";
        viewAllLink.target = "_blank";
        viewAllLink.style.color = "#e50914";
        viewAllLink.style.textDecoration = "none";
        viewAllLink.style.fontWeight = "bold";
        
        viewAllItem.appendChild(viewAllLink);
        movieList.appendChild(viewAllItem);
      }
    });
  } catch (error) {
    console.error("Error displaying movies:", error);
  }
}

// Clear watched list both locally and in Supabase
function clearWatchedList(authSession) {
  try {
    console.log("Clearing watched list");
    
    // Show confirmation dialog
    if (!confirm("Are you sure you want to clear your entire watch history?")) {
      return;
    }
    
    // Clear from local storage
    chrome.storage.local.set({ watchedMovies: [] }, () => {
      console.log("Local storage cleared");
      
      // Update the UI
      const movieList = document.getElementById("movie-list");
      movieList.innerHTML = "";
      const li = document.createElement("li");
      li.textContent = "No movies watched yet";
      li.style.fontStyle = "italic";
      li.style.color = "#888";
      movieList.appendChild(li);
    });
    
    // Clear from Supabase
    if (authSession && authSession.user) {
      const userId = authSession.user.id;
      
      console.log("Clearing Supabase data for user:", userId);
      
      fetch(
        `${SUPABASE_URL}/rest/v1/watched_movies?user_id=eq.${userId}`, 
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${authSession.access_token}`
          }
        }
      ).then(response => {
        if (!response.ok) {
          throw new Error(`Error clearing Supabase data: ${response.status}`);
        }
        console.log("Successfully cleared Supabase data");
      }).catch(error => {
        console.error("Error clearing Supabase data:", error);
      });
    }
  } catch (error) {
    console.error("Error in clearWatchedList:", error);
  }
}