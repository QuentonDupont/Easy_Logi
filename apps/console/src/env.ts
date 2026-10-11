/**
 * Centralised, validated access to the environment variables the console needs.
 * Server-only secrets are never referenced from client components.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

/** True when the public Supabase config is present. */
export function hasSupabaseConfig(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

export function requirePublicEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", publicEnv.supabaseUrl),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", publicEnv.supabaseAnonKey),
  };
}
