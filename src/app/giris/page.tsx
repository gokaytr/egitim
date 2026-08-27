"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { GoogleButton } from "@/components/google-button";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

function GirisForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, teacher_pending")
      .eq("id", data.user.id)
      .single();

    if (profile?.teacher_pending) {
      router.push("/basvuru-bekleniyor");
      router.refresh();
      return;
    }

    const redirect = searchParams.get("redirect");
    router.push(redirect || ROLE_HOME[profile?.role ?? "student"] || "/");
    router.refresh();
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
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense fallback={null}>
        <GirisForm />
      </Suspense>
    </div>
  );
}
