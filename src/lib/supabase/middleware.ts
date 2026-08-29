import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { shouldTrackPageView, trackPageView } from "@/lib/analytics/track";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  moderator: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

const PROTECTED_PREFIXES = ["/admin", "/ogretmen", "/ogrenci", "/basvuru-bekleniyor"];

const VISITOR_COOKIE = "ov_vid";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 yil

export async function updateSession(request: NextRequest, event: NextFetchEvent) {
  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith("/admin");
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  // Ziyaretci kimligi: uzun omurlu bir cerezden okunuyor, yoksa burada
  // uretiliyor. Cerez, asagida donen response'un neresi olursa olsun
  // (yonlendirme dahil) en sonda ekleniyor - boylece mevcut yonlendirme
  // mantigina dokunmadan tum sayfalarda calisiyor.
  const existingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitorId ?? crypto.randomUUID();
  const isNewVisitor = !existingVisitorId;
  const country = request.headers.get("x-vercel-ip-country");

  let response: NextResponse;
  let userIdForTracking: string | null = null;

  // Anasayfa, giriş, kayıt gibi herkese açık sayfalarda Supabase'e hiç
  // istek atmıyoruz - her sayfa yüklemesinde gereksiz bir ağ round-trip'i
  // eklemek, tüm siteyi yavaşlatıyordu. Sadece korumalı rotalarda oturum
  // doğrulaması yapılır.
  if (!isProtected) {
    response = NextResponse.next({ request });
  } else {
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
    userIdForTracking = user?.id ?? null;

    // /admin, diger panellerden farkli davraniyor: admin olmayan biri (giris
    // yapmamis ya da baska rolde) buraya geldiginde login ekranina degil,
    // dogrudan anasayfaya atiliyor - admin panelinin varligi bile belli olmasin.
    if (isAdminPath) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        response = NextResponse.redirect(url);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role !== "admin") {
          const url = request.nextUrl.clone();
          url.pathname = "/";
          response = NextResponse.redirect(url);
        } else {
          response = supabaseResponse;
        }
      }
    } else if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/giris";
      url.searchParams.set("redirect", path);
      response = NextResponse.redirect(url);
    } else {
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
          response = NextResponse.redirect(url);
        } else {
          response = supabaseResponse;
        }
      } else if (path === "/basvuru-bekleniyor") {
        const url = request.nextUrl.clone();
        url.pathname = role ? ROLE_HOME[role] ?? "/" : "/";
        response = NextResponse.redirect(url);
      } else if (role === "admin") {
        // Admin, ogrenci ve ogretmen panellerini onizlemek icin serbestce
        // gezebilir (kendi paneline geri atilmaz).
        response = supabaseResponse;
      } else {
        const allowedPrefix = role ? ROLE_HOME[role]?.split("/")[1] : undefined;
        const requestedPrefix = path.split("/")[1];

        if (role && allowedPrefix && requestedPrefix !== allowedPrefix) {
          const url = request.nextUrl.clone();
          url.pathname = ROLE_HOME[role] ?? "/";
          response = NextResponse.redirect(url);
        } else {
          response = supabaseResponse;
        }
      }
    }
  }

  if (isNewVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: VISITOR_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  if (shouldTrackPageView(path)) {
    event.waitUntil(
      trackPageView({
        path,
        visitorId,
        isNewVisitor,
        userId: userIdForTracking,
        country,
      })
    );
  }

  return response;
}

export { ROLE_HOME };
