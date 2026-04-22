import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if values are missing or are still the placeholders from .env.example
const isPlaceholder = (value: string | undefined) =>
    !value || value.includes('your_supabase_url') || value.includes('your_supabase_anon_key');

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
    console.error('CRITICAL ERROR: Supabase credentials are not set in .env file.');
    console.error('Please edit /Users/usuario/Documents/APPcontratos/.env and replace placeholders with your actual Supabase URL and Key.');
}

let client;

try {
    if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
        // Return a dummy client that logs errors but doesn't crash the app immediately on load
        // Authentication calls will still fail, but the UI should render.
        client = createClient('https://placeholder.supabase.co', 'placeholder');
    } else {
        client = createClient(supabaseUrl, supabaseAnonKey);
    }
} catch (error) {
    console.error('Supabase Client initialization failed:', error);
    // Absolte fallback
    client = createClient('https://fallback.supabase.co', 'fallback-key');
}

export const supabase = client;
