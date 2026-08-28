import { createClient } from "@/lib/supabase/server";
import { Card, Badge, StatCard } from "@/components/ui";
import { StudentSwitcher } from "@/components/student-switcher";
import { AddChildForm } from "@/components/add-child-form";
import { ReportTabs } from "@/components/report-tabs";
import {
  buildAttemptEvent,
  buildContentViewEvent,
  buildDiagnosisEvent,
  buildReferralEvent,
  sortEventsDesc,
  groupEventsByDay,
  type ActivityEvent,
} from "@/lib/reports/activity-feed";
import { buildOverviewSummary } from "@/lib/reports/overview-summary";

const WEAKNESS_TONE: Record<string, "green" | "amber" | "red"> = {
  none: "green",
  minor: "amber",
  major: "red",
};

const REFERRAL_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  matched: "Öğretmen bulundu",
  scheduled: "Randevu planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export default async function RaporPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const { studentId: requestedStudentId } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user?.id)
    .single();

  const role = callerProfile?.role;

  // Kim hangi ogrencinin raporunu gorebilir:
  // - veli -> kendine bagli cocuklari (birden fazla olabilir, secici gosterilir)
  // - admin -> tum ogrenciler arasindan secebilir ("veli gorunumu" onizlemesi)
  // - diger roller (ogrencinin kendisi vb.) -> sadece kendi raporu
  let candidates: { id: string; full_name: string }[] = [];
  let pageTitle = "İlerleme Raporu";
  let showAddChild = false;

  if (role === "parent") {
    const { data: links } = await supabase
      .from("parent_student_links")
      .select("student_id, profiles!parent_student_links_student_id_fkey(id, full_name)")
      .eq("parent_id", userData.user?.id);
    candidates = (links ?? [])
      .map((l) => (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles))
      .filter((p): p is { id: string; full_name: string } => !!p);
    pageTitle = "Veli Raporu";
    showAddChild = true;
  } else if (role === "admin") {
    const { data: students } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "student")
      .order("full_name");
    candidates = students ?? [];
    pageTitle = "Veli Görünümü (Admin Önizleme)";
  }

  const studentId =
    (requestedStudentId && candidates.some((c) => c.id === requestedStudentId) ? requestedStudentId : candidates[0]?.id) ??
    (role === "parent" || role === "admin" ? undefined : userData.user?.id);

  if ((role === "parent" || role === "admin") && !studentId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
        </div>
        {role === "parent" && (
          <Card>
            <h2 className="mb-2 font-semibold text-slate-900">Henüz bağlı bir öğrenci yok</h2>
            <p className="mb-4 text-sm text-slate-500">Çocuğunun e-posta adresini gir, hesabına bağlansın.</p>
            <AddChildForm />
          </Card>
        )}
        {role === "admin" && (
          <Card>
            <p className="text-sm text-slate-500">Henüz öğrenci kaydı yok.</p>
          </Card>
        )}
      </div>
    );
  }

  const [
    { data: studentProfile },
    { data: attempts },
    { data: diagnoses },
    { data: planItems },
    { data: referrals },
    { data: views },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, grade_level, exam_target").eq("id", studentId).single(),
    supabase
      .from("student_attempts")
      .select("id, started_at, finished_at, total_questions, correct_count, wrong_count, empty_count, topics(name)")
      .eq("student_id", studentId)
      .order("started_at", { ascending: false }),
    supabase
      .from("diagnoses")
      .select("id, ai_summary, common_error_pattern, weakness_level, recommended_action, created_at, topics(name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("study_plan_items")
      .select("id, status, target_minutes, target_questions, topics(name), study_plans!inner(student_id, status)")
      .eq("study_plans.student_id", studentId),
    supabase
      .from("tutor_referrals")
      .select("id, status, requested_at, topics(name)")
      .eq("student_id", studentId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("lesson_content_views")
      .select("id, viewed_at, lesson_contents(title, topics(name))")
      .eq("student_id", studentId)
      .order("viewed_at", { ascending: false }),
  ]);

  const totalSolved = (attempts ?? []).reduce((sum, a) => sum + (a.total_questions ?? 0), 0);
  const totalCorrect = (attempts ?? []).reduce((sum, a) => sum + (a.correct_count ?? 0), 0);
  const totalWrong = (attempts ?? []).reduce((sum, a) => sum + (a.wrong_count ?? 0), 0);
  const totalEmpty = (attempts ?? []).reduce((sum, a) => sum + (a.empty_count ?? 0), 0);
  const accuracy = totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : null;
  const distinctContentViewed = new Set((views ?? []).map((v) => v.id)).size;
  const targetQuestionsRemaining = (planItems ?? [])
    .filter((p) => p.status !== "done")
    .reduce((sum, p) => sum + (p.target_questions ?? 0), 0);
  const pendingReferrals = (referrals ?? []).filter((r) => r.status === "pending" || r.status === "matched");

  // Genel durum: dogruluk oranina ve bekleyen ozel ders talebine gore basit bir ozet.
  let overallLabel = "Henüz veri yok";
  let overallTone: "green" | "amber" | "red" = "amber";
  if (pendingReferrals.length > 0) {
    overallLabel = "Özel ders desteği bekleniyor";
    overallTone = "red";
  } else if (accuracy !== null) {
    if (accuracy >= 75) {
      overallLabel = "İyi gidiyor";
      overallTone = "green";
    } else if (accuracy >= 50) {
      overallLabel = "Takip gerekiyor";
      overallTone = "amber";
    } else {
      overallLabel = "Acil destek gerekiyor";
      overallTone = "red";
    }
  }

  // Aktivite akisi: farkli tablolardan gelen olaylari birlestir.
  const events: ActivityEvent[] = [];
  for (const a of attempts ?? []) {
    const topic = firstOf(a.topics);
    events.push(
      buildAttemptEvent({
        id: a.id,
        topicName: topic?.name ?? "Genel",
        finished_at: a.finished_at,
        started_at: a.started_at,
        correct_count: a.correct_count,
        wrong_count: a.wrong_count,
        empty_count: a.empty_count,
      })
    );
  }
  for (const v of views ?? []) {
    const content = firstOf(v.lesson_contents);
    const topic = firstOf(content?.topics);
    events.push(
      buildContentViewEvent({
        id: v.id,
        topicName: topic?.name ?? "Genel",
        contentTitle: content?.title ?? "Konu Anlatımı",
        viewed_at: v.viewed_at,
      })
    );
  }
  for (const d of diagnoses ?? []) {
    const topic = firstOf(d.topics);
    events.push(
      buildDiagnosisEvent({
        id: d.id,
        topicName: topic?.name ?? "Genel",
        weakness_level: d.weakness_level,
        created_at: d.created_at,
      })
    );
  }
  for (const r of referrals ?? []) {
    const topic = firstOf(r.topics);
    events.push(
      buildReferralEvent({
        id: r.id,
        topicName: topic?.name ?? "Genel",
        requested_at: r.requested_at,
      })
    );
  }

  const sortedEvents = sortEventsDesc(events);
  const lastActivity = sortedEvents[0];
  const dailyGroups = groupEventsByDay(events);

  const weakTopicNames = Array.from(
    new Set(
      (diagnoses ?? [])
        .filter((d) => d.weakness_level === "major")
        .map((d) => firstOf(d.topics)?.name)
        .filter((n): n is string => !!n)
    )
  ).slice(0, 5);

  const overviewParagraphs = buildOverviewSummary({
    studentFirstName: studentProfile?.full_name?.split(" ")[0] ?? "Öğrenci",
    totalSolved,
    totalCorrect,
    totalWrong,
    totalEmpty,
    accuracy,
    distinctContentViewed,
    weakTopicNames,
    latestCommonErrorPattern: diagnoses?.[0]?.common_error_pattern,
    pendingReferralTopics: pendingReferrals.map((r) => firstOf(r.topics)?.name).filter((n): n is string => !!n),
  });

  const overviewTab = (
    <>
      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Genel Durum Raporu</h2>
        <div className="flex flex-col gap-2">
          {overviewParagraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-600">
              {p}
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-slate-900">Son Aktivite</h2>
        {lastActivity ? (
          <p className="text-sm text-slate-600">
            <span className="mr-2 text-xs text-slate-400">
              {new Date(lastActivity.occurredAt).toLocaleString("tr-TR")}
            </span>
            {lastActivity.description}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Henüz herhangi bir aktivite yok.</p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Çözülen Soru" value={totalSolved} hint={`${totalCorrect} doğru · ${totalWrong} yanlış · ${totalEmpty} boş`} />
        <StatCard label="Başarı Oranı" value={accuracy !== null ? `%${accuracy}` : "-"} />
        <StatCard label="İzlenen Konu Anlatımı" value={distinctContentViewed} />
        <StatCard label="Hedeflenen Kalan Soru" value={targetQuestionsRemaining} />
      </div>
    </>
  );

  const dailyTab = (
    <>
      {!dailyGroups.length && (
        <Card>
          <p className="text-sm text-slate-500">Henüz kaydedilmiş bir aktivite yok.</p>
        </Card>
      )}
      {dailyGroups.map((group) => (
        <Card key={group.dateKey}>
          <h2 className="mb-3 font-semibold capitalize text-slate-900">{group.dateLabel}</h2>
          <ul className="flex flex-col gap-2">
            {group.events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{e.description}</span>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(e.occurredAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );

  const generalTab = (
    <>
      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Özel Ders Durumu</h2>
        {!referrals?.length && <p className="text-sm text-slate-500">Şu ana kadar özel ders ihtiyacı çıkmadı.</p>}
        <ul className="flex flex-col gap-2">
          {referrals?.map((r) => {
            const topic = firstOf(r.topics);
            return (
              <li key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{topic?.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{new Date(r.requested_at).toLocaleDateString("tr-TR")}</span>
                  <Badge tone={r.status === "pending" ? "amber" : r.status === "completed" ? "green" : "default"}>
                    {REFERRAL_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Çalışma Programı</h2>
        {!planItems?.length && <p className="text-sm text-slate-500">Henüz çalışma programına konu eklenmemiş.</p>}
        <ul className="flex flex-col gap-2">
          {planItems?.map((p) => {
            const topic = firstOf(p.topics);
            return (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{topic?.name}</span>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{p.target_questions} soru · {p.target_minutes} dk</span>
                  <Badge tone={p.status === "done" ? "green" : p.status === "in_progress" ? "amber" : "default"}>
                    {p.status === "done" ? "Tamamlandı" : p.status === "in_progress" ? "Devam ediyor" : "Başlanmadı"}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Konu Anlatımı İzleme Geçmişi</h2>
        {!views?.length && <p className="text-sm text-slate-500">Henüz konu anlatımı izlenmemiş.</p>}
        <ul className="flex flex-col gap-2">
          {views?.map((v) => {
            const content = firstOf(v.lesson_contents);
            const topic = firstOf(content?.topics);
            return (
              <li key={v.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{topic?.name} — {content?.title}</span>
                <span className="text-xs text-slate-400">{new Date(v.viewed_at).toLocaleDateString("tr-TR")}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Eksikler / Analiz Geçmişi</h2>
        {!diagnoses?.length && <p className="text-sm text-slate-500">Henüz analiz yok, bir konu testi çözerek başlayabilirsin.</p>}
        <ul className="flex flex-col gap-3">
          {diagnoses?.map((d) => {
            const topic = firstOf(d.topics);
            return (
              <li key={d.id} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-slate-900">{topic?.name}</span>
                  <Badge tone={WEAKNESS_TONE[d.weakness_level] ?? "default"}>{d.weakness_level}</Badge>
                  <span className="ml-auto text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString("tr-TR")}</span>
                </div>
                <p className="whitespace-pre-line text-sm text-slate-600">{d.ai_summary}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
        <p className="text-sm text-slate-500">
          {studentProfile?.full_name} · {studentProfile?.grade_level ? `${studentProfile.grade_level}. sınıf` : "sınıf belirtilmemiş"} ·
          {" "}Hedef: {studentProfile?.exam_target ?? "belirtilmemiş"}
        </p>
      </div>

      {role === "parent" && showAddChild && (
        <Card>
          <h2 className="mb-2 font-semibold text-slate-900">Öğrenci Ekle</h2>
          <p className="mb-3 text-xs text-slate-500">Birden fazla çocuğun varsa hepsini buradan ekleyip aralarında geçiş yapabilirsin.</p>
          <AddChildForm />
        </Card>
      )}

      {studentId && (
        <StudentSwitcher
          candidates={candidates}
          currentId={studentId}
          label={role === "admin" ? "Öğrenci seç" : "Çocuk seç"}
        />
      )}

      <div>
        <Badge tone={overallTone}>Genel durum: {overallLabel}</Badge>
      </div>

      <ReportTabs overview={overviewTab} daily={dailyTab} general={generalTab} />
    </div>
  );
}
