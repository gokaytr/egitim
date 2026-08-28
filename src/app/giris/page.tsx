"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { GoogleButton } from "@/components/google-button";
import { AuthPageBackground, AuthPageHeader } from "@/components/auth-background";

// middleware.ts'teki ROLE_HOME ile ayni esleme - middleware server-only
// import'lar icerdigi icin buradan dogrudan import edilemiyor, kucuk bir
// kopyasi yeterli (roller degisirse ikisi de guncellenmeli).
const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  moderator: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

function GirisForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Google girisi /api/auth/callback route'unda basarisiz olursa buraya
  // ?error=oauth&detail=... ile geri donuyor - gercek sebebi burada gosteriyoruz.
  useEffect(() => {
    if (searchParams.get("error") === "oauth") {
      setError(searchParams.get("detail") || "Google ile giriş başarısız oldu.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("İstek zaman aşımına uğradı, tekrar dener misin?")), 15000)
      );

      const { data, error: signInError } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]);

      if (signInError || !data.user) {
        setError("E-posta veya şifre hatalı.");
        setLoading(false);
        return;
      }

      // Rolüne göre hangi panele gideceğini burada sormuyoruz (bu ekstra bir
      // veritabanı sorgusu daha demekti) - middleware zaten her korumalı
      // sayfada rolünü kontrol edip yanlış panele düşersen doğrusuna
      // yönlendiriyor. Biz sadece herhangi bir korumalı sayfaya (ya da
      // ?redirect= ile gelinen sayfaya) tam sayfa yönlendirme yapıyoruz;
      // tam sayfa yönlendirme (router.push değil) session cookie'sinin bir
      // sonraki sunucu render'ında kesin taze okunmasını garanti ediyor.
      const redirect = searchParams.get("redirect");
      if (redirect) {
        window.location.href = redirect;
        return;
      }

      // Redirect parametresi yoksa (dogrudan /giris'e gelindiyse) rolune gore
      // dogru panele gonder - admin/ogretmen/veli her zaman /ogrenci'ye
      // dusup oradan kendi paneline yonlendirilmeyi beklemesin.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      window.location.href = ROLE_HOME[profile?.role ?? ""] ?? "/ogrenci";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Giriş yap</h1>
      <p className="mt-1 text-sm text-slate-500">Öğrenci, öğretmen ve yönetici girişi aynı formdan yapılır.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">E-posta</label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Şifre</label>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Giriş yapılıyor..." : "Giriş yap"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">veya</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <GoogleButton label="Google ile giriş yap" />

      <p className="mt-6 text-center text-sm text-slate-500">
        Hesabın yok mu? <Link href="/kayit" className="font-medium text-indigo-600">Kayıt ol</Link>
      </p>
    </div>
  );
}

export default function GirisPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <AuthPageBackground />
      <AuthPageHeader />
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <Suspense fallback={null}>
          <GirisForm />
        </Suspense>
      </div>
    </div>
  );
}
