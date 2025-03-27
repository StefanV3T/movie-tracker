import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://georzuqfssefsmcunjnu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlb3J6dXFmc3NlZnNtY3Vuam51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMjA5MDcsImV4cCI6MjA1ODU5NjkwN30.qg3vPTBq1_vBGCL2c6QpE53J8HaLPj9TWSrDElRjHgo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;