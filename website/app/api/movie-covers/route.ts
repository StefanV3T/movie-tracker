import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TMDB_API_KEY = process.env.TMDB_API_KEY; // Add this to your .env.local file
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Create a Supabase client with the service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('id');
  
  if (!movieId) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }
  
  try {
    // First check if we already have cover data in Supabase
    const { data: movie } = await supabase
      .from('watched_movies')
      .select('*')
      .eq('id', movieId)
      .single();
      
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }
    
    // If we already have cover info, return it
    if (movie.cover_url) {
      return NextResponse.json({
        success: true,
        movie: {
          id: movie.id,
          title: movie.title,
          cover_url: movie.cover_url,
          release_year: movie.release_year || null
        }
      });
    }
    
    // Otherwise, fetch from TMDb
    const title = movie.title;
    
    // First try movies
    const movieResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&page=1`
    );
    
    const movieData = await movieResponse.json();
    
    let coverUrl = null;
    let releaseYear = null;
    
    // Check if we got movie results
    if (movieData.results && movieData.results.length > 0) {
      const bestMatch = movieData.results[0];
      coverUrl = bestMatch.poster_path ? `${TMDB_IMAGE_BASE_URL}${bestMatch.poster_path}` : null;
      releaseYear = bestMatch.release_date ? bestMatch.release_date.substring(0, 4) : null;
    } else {
      // Try TV shows if no movie match
      const tvResponse = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&page=1`
      );
      
      const tvData = await tvResponse.json();
      
      if (tvData.results && tvData.results.length > 0) {
        const bestMatch = tvData.results[0];
        coverUrl = bestMatch.poster_path ? `${TMDB_IMAGE_BASE_URL}${bestMatch.poster_path}` : null;
        releaseYear = bestMatch.first_air_date ? bestMatch.first_air_date.substring(0, 4) : null;
      }
    }
    
    // Update the movie record with the cover URL we found (if any)
    if (coverUrl) {
      await supabase
        .from('watched_movies')
        .update({
          cover_url: coverUrl,
          release_year: releaseYear
        })
        .eq('id', movieId);
    }
    
    return NextResponse.json({
      success: true,
      movie: {
        id: movie.id,
        title: movie.title,
        cover_url: coverUrl,
        release_year: releaseYear
      }
    });
    
  } catch (error) {
    console.error('Error fetching movie cover:', error);
    return NextResponse.json({ error: 'Failed to fetch movie cover' }, { status: 500 });
  }
}