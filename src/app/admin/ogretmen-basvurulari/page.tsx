import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { TeacherApprovalButtons } from "./teacher-approval-buttons";

export default async function OgretmenBasvurulariPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("teacher_pending", true)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Öğretmen Başvuruları</h1>
        <p className="text-sm text-slate-500">
          Kayıt sırasında &quot;Öğretmenim&quot; seçen kullanıcılar onaylanmadan öğretmen paneline giremez.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {pending?.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">{p.full_name}</p>
              <p className="text-sm text-slate-500">{p.email}</p>
              <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString("tr-TR")}</p>
            </div>
            <TeacherApprovalButtons profileId={p.id} />
          </Card>
        ))}
        {!pending?.length && <p className="text-sm text-slate-500">Onay bekleyen öğretmen başvurusu yok.</p>}
      </div>
    </div>
  );
}
