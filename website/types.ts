export interface Movie {
    id: string;
    title: string;
    watched_at: string;
    last_watched?: string;
    view_count: number;
    platform?: string;
    user_id: string;
    rating?: number;
    cover_url?: string;
    release_year?: string;
    movie_url?: string;
    is_favorite?: boolean;
  }