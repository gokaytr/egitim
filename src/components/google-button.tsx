"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Hem giriş hem kayıt sayfasında kullanılan "Google ile devam et" butonu.
// Google'dan dönen kullanıcı /api/auth/callback route'unda oturuma çevrilip
// rolüne göre yönlendiriliyor (yeni kullanıcılar varsayılan olarak "student" rolüyle açılır).
export function GoogleButton({ label = "Google ile devam et" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      // Basarili olursa tarayici zaten Google'a yonlendiriliyor, buraya hic
      // dusmuyoruz. Buraya dusuyorsak bir sey ters gitmis demektir.
      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
      </svg>
      {loading ? "Yönlendiriliyor..." : label}
    </button>
    {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
