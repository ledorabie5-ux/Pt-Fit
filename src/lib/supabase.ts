import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (window as any).__SUPABASE_URL__ || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (window as any).__SUPABASE_ANON_KEY__ || '';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance && isSupabaseConfigured()) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
