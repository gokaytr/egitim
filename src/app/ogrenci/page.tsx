import { createClient } from "@/lib/supabase/server";
import { Card, StatCard } from "@/components/ui";
import { TopicPicker } from "./topic-picker";

export default async function OgrenciDashboard() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const [{ data: profile }, { count: attemptCount }, { data: lastDiagnosis }] = await Promise.all([
    supabase.from("profiles").select("full_name, grade_level, exam_target").eq("id", userData.user?.id).single(),
    supabase.from("student_attempts").select("*", { count: "exact", head: true }).eq("student_id", userData.user?.id),
    supabase
      .from("diagnoses")
      .select("ai_summary, weakness_level, recommended_action, topics(name)")
      .eq("student_id", userData.user?.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Bir konu seç, kendini test et</h2>
        <TopicPicker />
      </Card>
    </div>
  );
}
