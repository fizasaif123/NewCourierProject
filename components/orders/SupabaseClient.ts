import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qpkaklmbiwitlroykjim.supabase.co"; // Replace with your Supabase URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa2FrbG1iaXdpdGxyb3lramltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MTM4NjIsImV4cCI6MjA1MjM4OTg2Mn0.4y_ogmlsnMMXCaISQeVo-oS6zDJnyAVEeAo6p7Ms97U"; // Replace with your Supabase API Key

// Export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
