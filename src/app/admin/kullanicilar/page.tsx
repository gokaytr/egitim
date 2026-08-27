import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";

const ROLE_LABEL: Record<string, string> = {
  admin: "Yönetici",
  teacher: "Öğretmen",
  student: "Öğrenci",
  parent: "Veli",
};

const ROLE_TONE: Record<string, "default" | "green" | "amber" | "red"> = {
  admin: "red",
  teacher: "amber",
  student: "green",
  parent: "default",
};

export default async function KullanicilarPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, grade_level, exam_target, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Kullanıcılar</h1>
        <p className="text-sm text-slate-500">Tüm admin, öğretmen ve öğrenci hesapları</p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Ad Soyad</th>
              <th className="px-5 py-3 font-medium">E-posta</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Sınıf / Hedef</th>
              <th className="px-5 py-3 font-medium">Kayıt Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-900">{u.full_name}</td>
                <td className="px-5 py-3 text-slate-600">{u.email}</td>
                <td className="px-5 py-3">
                  <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {u.grade_level ? `${u.grade_level}. sınıf` : "-"} {u.exam_target ? `· ${u.exam_target}` : ""}
                </td>
                <td className="px-5 py-3 text-slate-400">{new Date(u.created_at).toLocaleDateString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users?.length && <p className="p-5 text-sm text-slate-500">Henüz kullanıcı yok.</p>}
      </Card>
    </div>
  );
}
