import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables or localStorage fallbacks
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const url = 
    (import.meta as any).env?.VITE_SUPABASE_URL || 
    (window as any).__SUPABASE_URL__ || 
    localStorage.getItem('VITE_SUPABASE_URL') || 
    localStorage.getItem('supabase_url') || 
    '';

  const anonKey = 
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
    (window as any).__SUPABASE_ANON_KEY__ || 
    localStorage.getItem('VITE_SUPABASE_ANON_KEY') || 
    localStorage.getItem('supabase_anon_key') || 
    '';

  return { url: url.trim(), anonKey: anonKey.trim() };
}

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey);
}

export function setSupabaseCredentials(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  localStorage.setItem('VITE_SUPABASE_URL', cleanUrl);
  localStorage.setItem('VITE_SUPABASE_ANON_KEY', cleanKey);
  localStorage.setItem('supabase_url', cleanUrl);
  localStorage.setItem('supabase_anon_key', cleanKey);
  supabaseInstance = null; // reset instance so next getSupabaseClient() creates a fresh client
}

export function clearSupabaseCredentials(): void {
  localStorage.removeItem('VITE_SUPABASE_URL');
  localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  supabaseInstance = null;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: "Supabase credentials (URL or Anon Key) are missing." };
  }
  try {
    const { error } = await client.from('users').select('id').limit(1);
    if (error) {
      if (error.message.includes('Invalid API key') || error.code === 'PGRST301' || error.message.includes('apiKey')) {
        return { 
          success: false, 
          message: "The Supabase Anon Key provided is invalid or expired. Please copy the 'anon public' key from your Supabase Dashboard > Project Settings > API." 
        };
      }
      // If table doesn't exist or RLS issue, API key itself is still authenticated
      if (error.message.includes('permission denied') || error.code === '42501') {
        return { 
          success: false, 
          message: "Connected to Supabase, but permission is denied for table 'users'. Please run the updated supabase_schema.sql in Supabase SQL Editor to grant table privileges." 
        };
      }
      if (error.message.includes('relation "public.users" does not exist') || error.code === '42P01') {
        return { success: true, message: "Connected to Supabase, but 'users' table is missing. Please run supabase_schema.sql in Supabase SQL Editor." };
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to reach Supabase server." };
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

/**
 * Upload image or file to Supabase Storage bucket 'ptfit-media'
 */
export async function uploadToSupabaseStorage(
  file: File | Blob,
  path: string,
  bucketName: string = 'ptfit-media'
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("Supabase client is not configured for storage upload.");
    return null;
  }

  try {
    let targetBucket = bucketName;
    let { data, error } = await client.storage
      .from(targetBucket)
      .upload(path, file, { upsert: true });

    if (error && targetBucket !== 'ptfit-media') {
      console.warn(`Upload to bucket '${targetBucket}' failed, retrying on default 'ptfit-media' bucket:`, error.message);
      targetBucket = 'ptfit-media';
      const retry = await client.storage
        .from(targetBucket)
        .upload(path, file, { upsert: true });
      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error || !data) {
      console.error("Error uploading to Supabase storage:", error);
      return null;
    }

    const { data: publicUrlData } = client.storage
      .from(targetBucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Storage upload exception:", err);
    return null;
  }
}
