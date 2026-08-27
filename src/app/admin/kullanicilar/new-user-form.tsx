"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Card } from "@/components/ui";

type NewUserRole = "teacher" | "student" | "parent";

// Admin'in normal kayit akisini atlayip dogrudan ogretmen/ogrenci/veli
// hesabi acabilmesi icin form. /api/admin/create-user route'una POST atar.
export function NewUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<NewUserRole>("student");
  const [gradeLevel, setGradeLevel] = useState("9");
  const [examTarget, setExamTarget] = useState("TYT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
        role,
        grade_level: gradeLevel,
        exam_target: examTarget,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json?.error ?? "Kullanıcı oluşturulamadı.");
      return;
    }

    setFullName("");
    setEmail("");
    setPassword("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="self-start">
        + Yeni Kullanıcı Ekle
      </Button>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Yeni kullanıcı oluştur</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Kapat
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ad Soyad</label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rol</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as NewUserRole)}>
              <option value="teacher">Öğretmen</option>
              <option value="student">Öğrenci</option>
              <option value="parent">Veli</option>
            </Select>
          </div>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-posta</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Geçici şifre</label>
            <Input type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="self-start">
          {loading ? "Oluşturuluyor..." : "Kullanıcı oluştur"}
        </Button>
      </form>
    </Card>
  );
}
