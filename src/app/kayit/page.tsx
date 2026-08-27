"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Select } from "@/components/ui";
import { GoogleButton } from "@/components/google-button";

type SignupRole = "student" | "parent" | "teacher_request";

const REDIRECT_AFTER_SIGNUP: Record<SignupRole, string> = {
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
  teacher_request: "/basvuru-bekleniyor",
};

export default function KayitPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("student");
  const [gradeLevel, setGradeLevel] = useState("9");
  const [examTarget, setExamTarget] = useState("TYT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // "teacher_request" gercek bir rol degil - trigger bunu gorunce hesabi
      // "student" rolunde ama teacher_pending=true olarak olusturuyor, admin
      // onayladiginda role="teacher" olarak degistiriliyor.
      const metadataRole = role === "teacher_request" ? "teacher_pending" : role;

      // Supabase bazen aglar/dus zamanlarinda hic cevap vermeyebiliyor - 15
      // saniyeden uzun surerse butonun sonsuza kadar donup kalmasi yerine
      // kullaniciya hata gosteriyoruz.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("İstek zaman aşımına uğradı, tekrar dener misin?")), 15000)
      );

      const { data, error: signUpError } = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: metadataRole,
              grade_level: role === "student" ? gradeLevel : "",
              exam_target: role === "student" ? examTarget : "",
            },
          },
        }),
        timeout,
      ]);

      if (signUpError || !data.user) {
        setError(signUpError?.message ?? "Kayıt başarısız oldu.");
        setLoading(false);
        return;
      }

      router.push(REDIRECT_AFTER_SIGNUP[role]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Kayıt ol</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ad Soyad</label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ben bir...</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as SignupRole)}>
              <option value="student">Öğrenciyim</option>
              <option value="parent">Veliyim</option>
              <option value="teacher_request">Öğretmenim</option>
            </Select>
            {role === "teacher_request" && (
              <p className="mt-1.5 text-xs text-amber-600">
                Öğretmen hesapları admin onayından sonra aktif olur. Kayıt olduktan sonra onay bekleme
                sayfasına yönlendirileceksin.
              </p>
            )}
          </div>
          {role === "student" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sınıf</label>
                <Select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>{g}. sınıf</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Hedef sınav</label>
                <Select value={examTarget} onChange={(e) => setExamTarget(e.target.value)}>
                  {["LGS", "TYT", "AYT", "YKS", "KPSS", "ALES", "DIGER"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-posta</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Şifre</label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Kayıt yapılıyor..." : "Kayıt ol"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">veya</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleButton label="Google ile kayıt ol" />

        <p className="mt-6 text-center text-sm text-slate-500">
          Zaten hesabın var mı? <Link href="/giris" className="font-medium text-indigo-600">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
