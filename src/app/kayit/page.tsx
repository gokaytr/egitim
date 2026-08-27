"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Select } from "@/components/ui";

export default function KayitPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [gradeLevel, setGradeLevel] = useState("9");
  const [examTarget, setExamTarget] = useState("TYT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          grade_level: role === "student" ? gradeLevel : "",
          exam_target: role === "student" ? examTarget : "",
        },
      },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Kayıt başarısız oldu.");
      setLoading(false);
      return;
    }

    router.push(role === "teacher" ? "/ogretmen" : "/ogrenci");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Kayıt ol</h1>
        <p className="mt-1 text-sm text-slate-500">Yönetici hesapları platform ekibi tarafından oluşturulur.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ad Soyad</label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ben bir...</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as "student" | "teacher")}>
              <option value="student">Öğrenciyim</option>
              <option value="teacher">Öğretmenim</option>
            </Select>
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

        <p className="mt-6 text-center text-sm text-slate-500">
          Zaten hesabın var mı? <Link href="/giris" className="font-medium text-indigo-600">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
