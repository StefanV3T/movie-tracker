const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || !TMDB_API_KEY) {
  console.error('Required environment variables are missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function searchTMDb(title) {
  // Clean the title before searching
  const cleanedTitle = cleanTitle(title);
  
  try {
    // Search for movies
    const movieResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}&page=1`
    );
    
    const movieData = await movieResponse.json();
    
    if (movieData.results && movieData.results.length > 0) {
      const movie = movieData.results[0];
      return {
        coverUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
        releaseYear: movie.release_date ? movie.release_date.substring(0, 4) : null,
        titleUsed: cleanedTitle
      };
    }
    
    // If no movie match, try TV shows
    const tvResponse = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}&page=1`
    );
    
    const tvData = await tvResponse.json();
    
    if (tvData.results && tvData.results.length > 0) {
      const show = tvData.results[0];
      return {
        coverUrl: show.poster_path ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}` : null,
        releaseYear: show.first_air_date ? show.first_air_date.substring(0, 4) : null,
        titleUsed: cleanedTitle
      };
    }
    
    // If nothing found with cleaned title, try the original title as a fallback
    if (cleanedTitle !== title) {
      console.log(`No results for cleaned title "${cleanedTitle}", trying original: "${title}"`);
      
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
              : null,
            titleUsed: title
          };
        }
      }
    }
    
    return { coverUrl: null, releaseYear: null, titleUsed: cleanedTitle };
  } catch (error) {
    console.error('Error searching TMDb:', error);
    return { coverUrl: null, releaseYear: null, titleUsed: cleanedTitle };
  }
}

async function updateAllMovies() {
  // Get all movies without cover URLs
  const { data: movies, error } = await supabase
    .from('watched_movies')
    .select('id, title')
    .is('cover_url', null);
  
  if (error) {
    console.error('Error fetching movies:', error);
    return;
  }
  
  console.log(`Found ${movies.length} movies without covers`);
  
  // Process movies in batches to respect API rate limits
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    console.log(`Processing ${i+1}/${movies.length}: "${movie.title}"`);
    
    const { coverUrl, releaseYear, titleUsed } = await searchTMDb(movie.title);
    
    if (coverUrl) {
      const { error: updateError } = await supabase
        .from('watched_movies')
        .update({ 
          cover_url: coverUrl, 
          release_year: releaseYear,
          // Optionally store the cleaned title for reference
          // clean_title: titleUsed 
        })
        .eq('id', movie.id);
      
      if (updateError) {
        console.error(`Error updating movie "${movie.title}":`, updateError);
      } else {
        console.log(`✅ Updated movie: "${movie.title}" with cover URL using title "${titleUsed}"`);
      }
    } else {
      console.log(`❌ No cover found for: "${movie.title}" (searched for "${titleUsed}")`);
    }
    
    // Respect TMDb API rate limits (40 requests per 10 seconds)
    if (i % 30 === 0 && i > 0) {
      console.log('Pausing for 10 seconds to respect API rate limits...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('Done updating movies');
}

// Run the main function
updateAllMovies()
  .catch(console.error)
  .finally(() => process.exit(0));