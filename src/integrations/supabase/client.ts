
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pxmkytffrwxydvnhjpzc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bWt5dGZmcnd4eWR2bmhqcHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzYwNzMsImV4cCI6MjA1MTg1MjA3M30.0XD0JnIEOh5sW4aIZJUSoDLcHAG2QjCRspdyczuPd5k";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
