import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function failRedirect(origin: string, detail: string) {
  const url = new URL("/giris", origin);
  url.searchParams.set("error", "oauth");
  url.searchParams.set("detail", detail);
  return NextResponse.redirect(url);
}

// Google (ve ileride eklenebilecek diğer OAuth sağlayıcıları) girişinden dönen
// kullanıcıyı oturuma çevirir. Hangi panele gideceğine burada karar vermiyoruz
// (bu, ek bir profiles sorgusu demekti) - middleware zaten her korumalı
// sayfada rolü kontrol edip yanlış yere düşersen doğrusuna yönlendiriyor,
// biz sadece herhangi bir korumalı sayfaya (/ogrenci) yönlendiriyoruz.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Google/Supabase yetkilendirme adiminda kendisi hata dondurmus olabilir
  // (orn. kullanici izni reddetti, consent screen testing modunda vs.)
  const providerError = searchParams.get("error_description") || searchParams.get("error");
  if (providerError) {
    return failRedirect(origin, providerError);
  }

  const code = searchParams.get("code");
  if (!code) {
    return failRedirect(origin, "Google'dan yetkilendirme kodu gelmedi.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return failRedirect(origin, error?.message ?? "Oturum oluşturulamadı.");
  }

  return NextResponse.redirect(`${origin}/ogrenci`);
}
