import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, StatCard, Badge } from "@/components/ui";
import { DiagnosisAcknowledgeButton } from "@/components/diagnosis-acknowledge-button";

export default async function OgrenciDashboard() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const [{ data: profile }, { count: attemptCount }, { data: lastDiagnosis }, { data: planItems }] = await Promise.all([
    supabase.from("profiles").select("full_name, grade_level, exam_target").eq("id", userData.user?.id).single(),
    supabase.from("student_attempts").select("*", { count: "exact", head: true }).eq("student_id", userData.user?.id),
    supabase
      .from("diagnoses")
      .select("id, ai_summary, weakness_level, recommended_action, acknowledged_at, topics(name)")
      .eq("student_id", userData.user?.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("study_plan_items")
      .select("id, status, target_minutes, target_questions, topics(id, name), study_plans!inner(student_id, status)")
      .eq("study_plans.student_id", userData.user?.id)
      .neq("status", "done"),
  ]);

  const lastTopic = lastDiagnosis && (Array.isArray(lastDiagnosis.topics) ? lastDiagnosis.topics[0] : lastDiagnosis.topics);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Merhaba {profile?.full_name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">
          {profile?.grade_level}. sınıf · Hedef: {profile?.exam_target}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Çözülen Test/Deneme" value={attemptCount ?? 0} />
        <StatCard label="Hedef Sınav" value={profile?.exam_target ?? "-"} />
        <StatCard label="Son Eksik Seviyesi" value={lastDiagnosis?.weakness_level ?? "-"} />
      </div>

      {lastDiagnosis && (
        <Card>
          <h2 className="mb-2 font-semibold text-slate-900">Son Analiz — {lastTopic?.name}</h2>
          <p className="text-sm text-slate-600">{lastDiagnosis.ai_summary}</p>
          <DiagnosisAcknowledgeButton diagnosisId={lastDiagnosis.id} acknowledgedAt={lastDiagnosis.acknowledged_at} />
        </Card>
      )}

      {planItems && planItems.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">Hedeflerim</h2>
          <p className="mb-2 text-xs text-slate-500">Velin veya kendi çalışma programın burada listelenir.</p>
          <ul className="flex flex-col gap-2">
            {planItems.map((p) => {
              const topic = Array.isArray(p.topics) ? p.topics[0] : p.topics;
              return (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{topic?.name}</span>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{p.target_questions} soru · {p.target_minutes} dk</span>
                    <Badge tone={p.status === "in_progress" ? "amber" : "default"}>
                      {p.status === "in_progress" ? "Devam ediyor" : "Başlanmadı"}
                    </Badge>
                    {topic?.id && (
                      <Link href={`/ogrenci/konu/${topic.id}`} className="font-medium text-indigo-600 underline">
                        Soruları çöz →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <p className="text-xs text-slate-400">Tüm derslerine soldaki menüden ulaşabilirsin.</p>
    </div>
  );
}
