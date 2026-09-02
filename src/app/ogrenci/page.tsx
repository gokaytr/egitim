import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { DiagnosisAcknowledgeButton } from "@/components/diagnosis-acknowledge-button";
import { DenemeActionButton } from "@/components/deneme-action-button";
import { PendingHistoryCard } from "@/components/pending-history-card";
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

  const [{ data: profile }, { data: recentAttempts }, { data: lastDiagnosis }, { data: planItems }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, grade_level, exam_target, level_label, level_score")
      .eq("id", studentId)
      .single(),
    // "Geçmiş Sonuçlarım" sekmesinde gösterilecek son bitirilmiş
    // test/denemeler - eskiden ayrı bir istatistik kartından yeni sekmede
    // /ogrenci/gecmis'e gidiliyordu, artık aynı kartın ikinci sekmesinde
    // burada özet olarak gösteriliyor.
    supabase
      .from("student_attempts")
      .select("id, finished_at, total_questions, correct_count, wrong_count, empty_count, topic_id, exam_id, topics(name), exams(title, exam_type)")
      .eq("student_id", studentId)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(8),
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

  const attemptSummaries = (recentAttempts ?? []).map((a) => {
    const topic = Array.isArray(a.topics) ? a.topics[0] : a.topics;
    const exam = Array.isArray(a.exams) ? a.exams[0] : a.exams;
    const title = topic?.name ?? exam?.title ?? "Test";
    const kind = exam ? (exam.exam_type === "seviye_tespit" ? "Seviye Tespit" : "Deneme") : "Konu Testi";
    const total = a.total_questions || a.correct_count + a.wrong_count + a.empty_count || 1;
    const pct = Math.round((a.correct_count / total) * 100);
    return {
      id: a.id,
      finishedAt: a.finished_at,
      title,
      kind,
      correct: a.correct_count,
      wrong: a.wrong_count,
      empty: a.empty_count,
      pct,
      // "Tekrar Çöz" linki icin - konu testleri /ogrenci/konu/{topic_id}'ye,
      // deneme/seviye tespit ise /ogrenci/deneme/{exam_id}'ye gonderiyor.
      redoHref: a.topic_id ? `/ogrenci/konu/${a.topic_id}` : a.exam_id ? `/ogrenci/deneme/${a.exam_id}` : null,
    };
  });

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
  //
  // Seviye tespit sinavi bittiginde zorlandigi konular icin study_plan_items
  // satirlari "seviye_tespit" kaynagiyla otomatik ekleniyor (bkz.
  // exam-runner.tsx) - bu konulari burada ayri bir rozetle one cikariyoruz
  // ki ogrenci "bunlari sana onerdik, calisma takvimine eklendi" farkini
  // gorsun.
  let pendingTopics: { id: string; name: string; subjectName: string; recommended: boolean }[] = [];
  if (profile?.grade_level != null) {
    const [{ data: gradeTopics }, { data: doneAttempts }, { data: recommendedItems }] = await Promise.all([
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
      supabase
        .from("study_plan_items")
        .select("topic_id, study_plans!inner(student_id, status)")
        .eq("study_plans.student_id", studentId)
        .eq("source", "seviye_tespit")
        .neq("status", "done"),
    ]);
    const doneTopicIds = new Set((doneAttempts ?? []).map((a) => a.topic_id));
    const recommendedTopicIds = new Set((recommendedItems ?? []).map((i) => i.topic_id));
    pendingTopics = (gradeTopics ?? [])
      .filter((t) => !doneTopicIds.has(t.id))
      .map((t) => {
        const subject = Array.isArray(t.subjects) ? t.subjects[0] : t.subjects;
        return { id: t.id, name: t.name, subjectName: subject?.name ?? "", recommended: recommendedTopicIds.has(t.id) };
      })
      .sort((a, b) => (a.recommended === b.recommended ? 0 : a.recommended ? -1 : 1))
      .slice(0, 8);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Merhaba {profile?.full_name?.split(" ")[0]} 👋</h1>
        <p className="text-base text-slate-500">
          {profile?.grade_level}. sınıf · Hedef: {profile?.exam_target}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <p className="mt-0.5 text-base text-slate-600">{DENEME_INTRO[gradeBand]}</p>
          </div>
          <DenemeActionButton mode="rastgele" label="🎲 Rastgele Deneme Çöz" />
        </Card>
      </div>

      <PendingHistoryCard pendingTopics={pendingTopics} attempts={attemptSummaries} />

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
