import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

function failRedirect(origin: string, detail: string) {
  const url = new URL("/giris", origin);
  url.searchParams.set("error", "oauth");
  url.searchParams.set("detail", detail);
  return NextResponse.redirect(url);
}

// Google (ve ileride eklenebilecek diğer OAuth sağlayıcıları) girişinden dönen
// kullanıcıyı oturuma çevirir ve rolüne göre kendi paneline yönlendirir.
// Her hata durumunda /giris sayfasina neden bilgisiyle donuyor (sessizce
// takilip kalmak yerine kullaniciya gercek sebebi gosteriyoruz).
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, teacher_pending")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    return failRedirect(origin, `Profil okunamadı: ${profileError.message}`);
  }

  if (profile?.teacher_pending) {
    return NextResponse.redirect(`${origin}/basvuru-bekleniyor`);
  }

  const target = ROLE_HOME[profile?.role ?? "student"] ?? "/ogrenci";
  return NextResponse.redirect(`${origin}${target}`);
}
