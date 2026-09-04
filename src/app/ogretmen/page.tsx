import { createClient } from "@/lib/supabase/server";
import { SimpleTabs } from "@/components/simple-tabs";
import { QuestionTopicPanel, type PanelTopic } from "@/components/question-topic-panel";
import { Badge } from "@/components/ui";
import { RecentQuestionsCard } from "@/components/recent-questions-card";
import { getRecentQuestionActivity } from "@/lib/questions/recent";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Kullanicinin "ogretmen panelinde de ilk acilis admin paneli gibi olsun, bu
// gorunen kisim (kartlar + son sorular) ikisinde de 2. sekme olsun" talebiyle
// admin/sorular/page.tsx ile ayni yapiya getirildi: 1. sekme (Genel Bakis) =
// dogrudan konu secici (QuestionTopicPanel) - SADECE goz atma/onaylama icin,
// soru EKLEME butonu burada yok (bkz. QuestionTopicPanel allowAdd={false}).
// 2. sekme "Soru Ekle / Onay" ise TEK soru ekleme yeri: ayni konu secici
// burada allowAdd={true} ile tekrar kullanilir, boylece ogretmen sinif/ders/
// konu secip soruyu elle, kopyala-yapistirla ya da PDF/Word/Excel dosyasiyla
// ekler ve hemen ayni ekrandaki "Onayla" butonuyla kendi soruşunu onaylar
// (bkz. question-topic-panel.tsx: ManualQuestionForm/BulkQuestionImport'a
// autoApprove={isAdmin} - ogretmen icin false, yani soru once "onay bekliyor"
// olarak eklenir, sonra ayni ekranda tek tikla onaylanir).
export default async function OgretmenDashboard({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  const { teacherId: requestedTeacherId } = await searchParams;
  const supabase = await createClient();
  const { teacherId: effectiveTeacherId } = await resolveEffectiveTeacher(requestedTeacherId);

  const { data: subjectRows } = await supabase
    .from("teacher_subjects")
    .select("subject_id, subjects(name)")
    .eq("teacher_id", effectiveTeacherId ?? "");
  const subjectIds = (subjectRows ?? []).map((r) => r.subject_id);
  const teacherSubjects = (subjectRows ?? []).map((r) => ({
    id: r.subject_id,
    name: firstOf(r.subjects)?.name ?? "Diğer",
  }));
  const branchNames = teacherSubjects.map((s) => s.name);

  let topics: PanelTopic[] = [];
  const counts = new Map<string, number>();
  let pendingQuestionCount = 0;

  if (subjectIds.length > 0) {
    const [{ data: rawTopics }, { data: countRows }, { count: pendingCount }] = await Promise.all([
      supabase
        .from("topics")
        .select("id, name, grade_level, subject_id, exam_types, target_question_count, subjects(name)")
        .in("subject_id", subjectIds),
      supabase
        .from("questions")
        .select("topic_id, topics!inner(subject_id)")
        .eq("is_reference_only", false)
        .in("topics.subject_id", subjectIds),
      supabase
        .from("questions")
        .select("id, topics!inner(subject_id)", { count: "exact", head: true })
        .eq("is_approved", false)
        .in("topics.subject_id", subjectIds),
    ]);

    topics = (rawTopics ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      grade_level: t.grade_level,
      subject_id: t.subject_id,
      subject_name: firstOf(t.subjects)?.name ?? "Diğer",
      exam_types: t.exam_types,
      target_question_count: t.target_question_count,
    }));

    (countRows ?? []).forEach((q) => {
      if (!q.topic_id) return;
      counts.set(q.topic_id, (counts.get(q.topic_id) ?? 0) + 1);
    });

    pendingQuestionCount = pendingCount ?? 0;
  }

  const recentActivity = await getRecentQuestionActivity(supabase, subjectIds.length > 0 ? subjectIds : ["__none__"]);

  const noBranchNotice = (
    <p className="text-sm text-amber-700">
      Size henüz bir branş atanmamış. Admin panelinden bir branş atanması gerekiyor.
    </p>
  );

  const genelBakisTab =
    subjectIds.length === 0 ? (
      noBranchNotice
    ) : (
      <QuestionTopicPanel
        topics={topics}
        counts={counts}
        subjects={teacherSubjects}
        subjectIds={subjectIds}
        isAdmin={false}
        allowAdd={false}
      />
    );

  const soruEkleOnayTab = (
    <div className="flex flex-col gap-6">
      {branchNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Branşların:</span>
          {branchNames.map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        Sınıf/sınav ve konuyu seç; soruyu elle, kopyala-yapıştırla ya da PDF, Word veya Excel dosyasıyla
        ekleyebilirsin — eklediğin soruyu hemen aşağıda beliren <strong>Onayla</strong> butonuyla kendin
        onaylayıp yayına alırsın.
      </div>

      {subjectIds.length === 0 ? (
        noBranchNotice
      ) : (
        <QuestionTopicPanel
          topics={topics}
          counts={counts}
          subjects={teacherSubjects}
          subjectIds={subjectIds}
          isAdmin={false}
          allowAdd
        />
      )}

      <RecentQuestionsCard
        added={recentActivity.added}
        approved={recentActivity.approved}
        isAdmin={false}
        currentUserId={effectiveTeacherId}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">
          Bir konu seç; o konunun soruları, ekleme ve onaylama seçenekleriyle birlikte aşağıda açılır.
        </p>
      </div>

      <SimpleTabs
        defaultKey="genel"
        syncQueryParam="tab"
        tabs={[
          { key: "genel", label: "Genel Bakış", content: genelBakisTab, tone: "indigo" },
          { key: "ozet", label: "Soru Ekle / Onay", content: soruEkleOnayTab, dot: pendingQuestionCount > 0, tone: "amber" },
        ]}
      />
    </div>
  );
}
