import { createClient } from "@/lib/supabase/server";
import { Card, Badge, StatCard } from "@/components/ui";

export default async function RaporPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  // Veli girişiyse kendi çocuğunun ilk kaydını göster (basit MVP - tek çocuk varsayımı)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user?.id).single();

  let studentId = userData.user?.id;
  if (profile?.role === "parent") {
    const { data: link } = await supabase
      .from("parent_student_links")
      .select("student_id")
      .eq("parent_id", userData.user?.id)
      .limit(1)
      .maybeSingle();
    studentId = link?.student_id;
  }

  const [{ data: diagnoses }, { data: planItems }, { count: attemptCount }] = await Promise.all([
    supabase
      .from("diagnoses")
      .select("id, ai_summary, common_error_pattern, weakness_level, recommended_action, created_at, topics(name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("study_plan_items")
      .select("id, status, target_minutes, target_questions, topics(name), study_plans!inner(student_id)")
      .eq("study_plans.student_id", studentId),
    supabase.from("student_attempts").select("*", { count: "exact", head: true }).eq("student_id", studentId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">İlerleme Raporu</h1>
        <p className="text-sm text-slate-500">Konu bazlı eksik tespiti geçmişi ve çalışma programı durumu</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Toplam Test/Deneme" value={attemptCount ?? 0} />
        <StatCard label="Analiz Sayısı" value={diagnoses?.length ?? 0} />
        <StatCard label="Program Kalemleri" value={planItems?.length ?? 0} />
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Analiz Geçmişi</h2>
        {!diagnoses?.length && <p className="text-sm text-slate-500">Henüz analiz yok, bir konu testi çözerek başlayabilirsin.</p>}
        <ul className="flex flex-col gap-3">
          {diagnoses?.map((d) => {
            const topic = Array.isArray(d.topics) ? d.topics[0] : d.topics;
            return (
              <li key={d.id} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-slate-900">{topic?.name}</span>
                  <Badge tone={d.weakness_level === "major" ? "red" : d.weakness_level === "minor" ? "amber" : "green"}>
                    {d.weakness_level}
                  </Badge>
                  <span className="ml-auto text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString("tr-TR")}</span>
                </div>
                <p className="text-sm text-slate-600">{d.ai_summary}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
