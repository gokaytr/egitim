import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function failRedirect(origin: string, detail: string) {
  const url = new URL("/giris", origin);
  url.searchParams.set("error", "oauth");
  url.searchParams.set("detail", detail);
  return NextResponse.redirect(url);
}

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  moderator: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

// Google (ve ileride eklenebilecek diğer OAuth sağlayıcıları) girişinden dönen
// kullanıcıyı oturuma çevirir.
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

  // Rolüne göre dogru panele gonder - admin/ogretmen/veli hesaplari da
  // Google ile giris yapabildigi icin burada da /giris'teki gibi rol bazli
  // yonlendirme yapiyoruz, aksi halde herkes /ogrenci'ye dusup oradan
  // kendi paneline atilmayi bekliyordu.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  return NextResponse.redirect(`${origin}${ROLE_HOME[profile?.role ?? ""] ?? "/ogrenci"}`);
}
