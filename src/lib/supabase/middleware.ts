import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  moderator: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

const PROTECTED_PREFIXES = ["/admin", "/ogretmen", "/ogrenci", "/basvuru-bekleniyor"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith("/admin");
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  // /admin, diger panellerden farkli davraniyor: admin olmayan biri (giris
  // yapmamis ya da baska rolde) buraya geldiginde login ekranina degil,
  // dogrudan anasayfaya atiliyor - admin panelinin varligi bile belli olmasin.
  if (isAdminPath) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, teacher_pending")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    // Onay bekleyen ogretmen basvurulari, admin onaylayana kadar sadece
    // bekleme sayfasini gorebilir.
    if (profile?.teacher_pending) {
      if (path !== "/basvuru-bekleniyor") {
        const url = request.nextUrl.clone();
        url.pathname = "/basvuru-bekleniyor";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    if (path === "/basvuru-bekleniyor") {
      const url = request.nextUrl.clone();
      url.pathname = role ? ROLE_HOME[role] ?? "/" : "/";
      return NextResponse.redirect(url);
    }

    // Admin, ogrenci ve ogretmen panellerini onizlemek icin serbestce
    // gezebilir (kendi paneline geri atilmaz).
    if (role === "admin") {
      return supabaseResponse;
    }

    const allowedPrefix = role ? ROLE_HOME[role]?.split("/")[1] : undefined;
    const requestedPrefix = path.split("/")[1];

    if (role && allowedPrefix && requestedPrefix !== allowedPrefix) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role] ?? "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export { ROLE_HOME };
