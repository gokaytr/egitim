import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, StatCard, Badge } from "@/components/ui";
import { DiagnosisAcknowledgeButton } from "@/components/diagnosis-acknowledge-button";
import { DenemeActionButton } from "@/components/deneme-action-button";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";
import { gradeBackgroundVariant } from "@/lib/grade-level";
import { LEVEL_TITLES, type LevelLabel } from "@/lib/deneme/level";

const DENEME_INTRO: Record<ReturnType<typeof gradeBackgroundVariant>, string> = {
  ilkokul: "Hazır mısın? Birkaç soruyla ne kadar güçlü olduğunu birlikte keşfedelim! 🚀",
  ortaokul: "Kendini test etmeye ne dersin? Seviyeni bulalım, sana en uygun soruları önerelim. 🎯",
  lise: "Sınav taktiğini bul: seviyeni tespit et, sana özel bir deneme ile pratik yap. 📘",
  default: "Kendini test etmeye ne dersin? Seviyeni bulalım, sana en uygun soruları önerelim. 🎯",
};

export default async function OgrenciDashboard({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId: requestedStudentId } = await searchParams;
  const supabase = await createClient();
  const { studentId, isAdminPreview } = await resolveEffectiveStudent(requestedStudentId);

  if (isAdminPreview && !studentId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Öğrenci Ekranı Önizlemesi</h1>
          <p className="text-sm text-slate-500">Henüz önizlenebilecek bir test öğrenci bulunmuyor.</p>
        </div>
      </div>
    );
  }

  const [{ data: profile }, { count: attemptCount }, { data: lastDiagnosis }, { data: planItems }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, grade_level, exam_target, level_label, level_score")
      .eq("id", studentId)
      .single(),
    supabase.from("student_attempts").select("*", { count: "exact", head: true }).eq("student_id", studentId),
    supabase
      .from("diagnoses")
      .select("id, ai_summary, weakness_level, recommended_action, acknowledged_at, topics(name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("study_plan_items")
      .select("id, status, target_minutes, target_questions, topics(id, name), study_plans!inner(student_id, status)")
      .eq("study_plans.student_id", studentId)
      .neq("status", "done"),
  ]);

  const lastTopic = lastDiagnosis && (Array.isArray(lastDiagnosis.topics) ? lastDiagnosis.topics[0] : lastDiagnosis.topics);
  const gradeBand = gradeBackgroundVariant(profile?.grade_level ?? null);
  const levelLabel = profile?.level_label as LevelLabel | null | undefined;
  const hasLevel = !!levelLabel;

  // "Çözülmesi Gerekenler": ogrencinin sinif duzeyindeki konulardan henuz
  // hic bitirilmemis (student_attempts'te finished_at dolu bir kaydi
  // olmayan) olanlar - karsilama ekraninda siralanip dogrudan konuya
  // gotursun diye. Zaten Hedeflerim (study_plan_items) sadece bir plan
  // olusturulmussa gorunuyordu; bu liste plan olsun olmasin her zaman
  // ogrencinin onunde ne kaldigini gosteriyor.
  let pendingTopics: { id: string; name: string; subjectName: string }[] = [];
  if (profile?.grade_level != null) {
    const [{ data: gradeTopics }, { data: doneAttempts }] = await Promise.all([
      supabase
        .from("topics")
        .select("id, name, order_index, subjects(name)")
        .eq("grade_level", profile.grade_level)
        .order("order_index"),
      supabase
        .from("student_attempts")
        .select("topic_id")
        .eq("student_id", studentId)
        .not("topic_id", "is", null)
        .not("finished_at", "is", null),
    ]);
    const doneTopicIds = new Set((doneAttempts ?? []).map((a) => a.topic_id));
    pendingTopics = (gradeTopics ?? [])
      .filter((t) => !doneTopicIds.has(t.id))
      .map((t) => {
        const subject = Array.isArray(t.subjects) ? t.subjects[0] : t.subjects;
        return { id: t.id, name: t.name, subjectName: subject?.name ?? "" };
      })
      .slice(0, 8);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Merhaba {profile?.full_name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">
          {profile?.grade_level}. sınıf · Hedef: {profile?.exam_target}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <Card className="flex flex-col justify-between gap-2 bg-gradient-to-br from-indigo-50 to-white">
          <div>
            <span className="text-sm text-slate-500">Deneme Çöz</span>
            <p className="mt-0.5 text-sm text-slate-600">{DENEME_INTRO[gradeBand]}</p>
          </div>
          <DenemeActionButton mode="rastgele" label="🎲 Rastgele Deneme Çöz" />
        </Card>
      </div>

      {pendingTopics.length > 0 && (
        <Card>
          <h2 className="mb-1 font-semibold text-slate-900">Çözülmesi Gerekenler</h2>
          <p className="mb-3 text-xs text-slate-500">Sınıfına ait henüz hiç bitirmediğin konular.</p>
          <ul className="flex flex-col gap-2">
            {pendingTopics.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <span className="text-slate-800">{t.name}</span>
                  {t.subjectName && <span className="ml-2 text-xs text-slate-400">{t.subjectName}</span>}
                </div>
                <Link href={`/ogrenci/konu/${t.id}`} className="font-medium text-indigo-600 underline">
                  Çöz →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
