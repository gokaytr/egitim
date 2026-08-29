import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, StatCard, Badge, Button } from "@/components/ui";
import { DiagnosisAcknowledgeButton } from "@/components/diagnosis-acknowledge-button";
import { DenemeActionButton } from "@/components/deneme-action-button";
import { gradeBackgroundVariant } from "@/lib/grade-level";
import { LEVEL_TITLES, type LevelLabel } from "@/lib/deneme/level";

const DENEME_INTRO: Record<ReturnType<typeof gradeBackgroundVariant>, string> = {
  ilkokul: "Hazır mısın? Birkaç soruyla ne kadar güçlü olduğunu birlikte keşfedelim! 🚀",
  ortaokul: "Kendini test etmeye ne dersin? Seviyeni bulalım, sana en uygun soruları önerelim. 🎯",
  lise: "Sınav taktiğini bul: seviyeni tespit et, sana özel bir deneme ile pratik yap. 📘",
  default: "Kendini test etmeye ne dersin? Seviyeni bulalım, sana en uygun soruları önerelim. 🎯",
};

export default async function OgrenciDashboard() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const [{ data: profile }, { count: attemptCount }, { data: lastDiagnosis }, { data: planItems }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, grade_level, exam_target, level_label, level_score")
      .eq("id", userData.user?.id)
      .single(),
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
  const gradeBand = gradeBackgroundVariant(profile?.grade_level ?? null);
  const levelLabel = profile?.level_label as LevelLabel | null | undefined;
  const hasLevel = !!levelLabel;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Merhaba {profile?.full_name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">
          {profile?.grade_level}. sınıf · Hedef: {profile?.exam_target}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Çözülen Test/Deneme" value={attemptCount ?? 0} />
        <Card className="flex flex-col justify-between gap-2">
          <div>
            <span className="text-sm text-slate-500">Seviyen</span>
            <p className="mt-0.5 text-2xl font-semibold text-slate-900">
              {hasLevel ? `${LEVEL_TITLES[levelLabel!]} · %${profile?.level_score ?? 0}` : "Henüz belirlenmedi"}
            </p>
          </div>
          <DenemeActionButton
            mode="seviye_tespit"
            variant="secondary"
            label={hasLevel ? "🔄 Yeniden Seviye Tespit Sınavı" : "🧭 Seviye Tespit Sınavına Başla"}
          />
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-indigo-50 to-white">
        <h2 className="mb-1 font-semibold text-slate-900">Deneme Zamanı 🎉</h2>
        <p className="mb-4 text-sm text-slate-600">{DENEME_INTRO[gradeBand]}</p>
        <div className="flex flex-wrap items-start gap-3">
          <DenemeActionButton mode="rastgele" label="🎲 Rastgele Deneme Çöz" />
          {hasLevel ? (
            <DenemeActionButton mode="onerilen" variant="secondary" label="⭐ Sana Uygun Deneme" />
          ) : (
            <div className="flex flex-col gap-1">
              <Button variant="secondary" disabled>
                ⭐ Sana Uygun Deneme
              </Button>
              <p className="max-w-xs text-xs text-slate-500">
                Şu an seviyenizi tam bilmediğimden size uygun bir deneme gösteremiyorum. Önce Seviye Tespit
                Sınavı&apos;nı çözelim mi?
              </p>
            </div>
          )}
        </div>
      </Card>

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
