// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://pxmkytffrwxydvnhjpzc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bWt5dGZmcnd4eWR2bmhqcHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzYwNzMsImV4cCI6MjA1MTg1MjA3M30.0XD0JnIEOh5sW4aIZJUSoDLcHAG2QjCRspdyczuPd5k";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);