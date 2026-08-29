import { createClient } from "@supabase/supabase-js";

// Middleware'den (Edge runtime) cagrilan, sayfa goruntulemesini page_views
// tablosuna yazan hafif fonksiyon. Cookie/oturum yonetimiyle ilgilenmiyor -
// sadece anon key ile tek satirlik bir insert atiyor. Hata olursa (ag,
// gecici Supabase kesintisi vb.) sessizce yutuyoruz; analitik kaydinin
// basarisiz olmasi sitenin calismasini asla etkilememeli.

type TrackPageViewInput = {
  path: string;
  visitorId: string;
  isNewVisitor: boolean;
  userId: string | null;
  country: string | null;
};

export async function trackPageView(input: TrackPageViewInput): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    await supabase.from("page_views").insert({
      path: input.path,
      visitor_id: input.visitorId,
      is_new_visitor: input.isNewVisitor,
      user_id: input.userId,
      country: input.country,
    });
  } catch {
    // sessizce yut
  }
}

// Statik dosyalar (.css, .js, .map, .woff vb.) ve /api rotalari icin sayfa
// goruntulemesi kaydedilmez - sadece gercek sayfa navigasyonlari sayilir.
export function shouldTrackPageView(path: string): boolean {
  if (path.startsWith("/api/")) return false;
  const lastSegment = path.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return false;
  return true;
}
