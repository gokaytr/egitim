import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Kullanıcı oturumuyla (RLS'e tabi) sunucu tarafı istemci
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component içinden çağrılırsa yoksayılabilir (middleware halleder)
          }
        },
      },
    }
  );
}

// RLS'i bypass eden yönetici istemcisi - SADECE güvenilir sunucu kodunda (API route) kullan
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
