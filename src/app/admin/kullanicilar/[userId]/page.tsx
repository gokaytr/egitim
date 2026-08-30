import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, StatCard } from "@/components/ui";
import { ROLE_LABEL, ROLE_TONE } from "@/lib/admin/role-labels";

const EXAM_TARGET_LABEL: Record<string, string> = {
  LGS: "LGS",
  TYT: "TYT",
  AYT: "AYT",
  YKS: "YKS",
  YDT: "YDT",
  KPSS: "KPSS",
  ALES: "ALES",
  DIGER: "Diğer",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

// Admin'in tek bir kisi (ogrenci/ogretmen/veli/admin) icin gordugu detay
// ekrani - hesap/uyelik bilgileri, ilgili kisiler ve aktivite ozeti.
// Kullanicilar sayfasindaki "Profil →" baglantilarindan acilir.
export default async function KullaniciProfilPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: person } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, grade_level, exam_target, created_at, teacher_pending, is_demo, level_label, level_score"
    )
    .eq("id", userId)
    .single();

  if (!person) {
    notFound();
  }

  const { data: lastVisit } = await supabase
    .from("page_views")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count: pageViewCount } = await supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  let relatedPeople: { label: string; items: { id: string; name: string; href?: string; sub?: string }[] }[] = [];
  let activityStats: { label: string; value: string | number; hint?: string }[] = [];

  if (person.role === "student") {
    const [{ data: parentLinks }, { data: teacherLinks }, { data: attempts }] = await Promise.all([
      supabase
        .from("parent_student_links")
        .select("parent_id, profiles!parent_student_links_parent_id_fkey(id, full_name, email)")
        .eq("student_id", userId),
      supabase
        .from("teacher_students")
        .select("teacher_id, profiles!teacher_students_teacher_id_fkey(id, full_name)")
        .eq("student_id", userId),
      supabase
        .from("student_attempts")
        .select("correct_count, wrong_count, empty_count, finished_at")
        .eq("student_id", userId),
    ]);

    const parents = (parentLinks ?? [])
      .map((l) => (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles))
      .filter((p): p is { id: string; full_name: string; email: string } => !!p);
    const teachers = (teacherLinks ?? [])
      .map((l) => (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles))
      .filter((p): p is { id: string; full_name: string } => !!p);

    relatedPeople = [
      {
        label: "Velisi",
        items: parents.map((p) => ({ id: p.id, name: p.full_name, sub: p.email, href: `/admin/kullanicilar/${p.id}` })),
      },
      {
        label: "Öğretmenleri",
        items: teachers.map((t) => ({ id: t.id, name: t.full_name, href: `/admin/kullanicilar/${t.id}` })),
      },
    ];

    const finished = (attempts ?? []).filter((a) => a.finished_at);
    const totalCorrect = finished.reduce((s, a) => s + (a.correct_count ?? 0), 0);
    const totalWrong = finished.reduce((s, a) => s + (a.wrong_count ?? 0), 0);
    const accuracy = totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : null;

    activityStats = [
      { label: "Tamamlanan Test", value: finished.length },
      { label: "Başarı Oranı", value: accuracy !== null ? `%${accuracy}` : "-", hint: `${totalCorrect} doğru, ${totalWrong} yanlış` },
      { label: "Son Aktivite", value: formatDate(lastVisit?.created_at), hint: `${pageViewCount ?? 0} sayfa görüntüleme` },
    ];
  } else if (person.role === "teacher") {
    const [{ data: subjectLinks }, { data: studentLinks }, { count: createdCount }, { count: approvedCount }] = await Promise.all([
      supabase.from("teacher_subjects").select("subject_id, subjects(id, name)").eq("teacher_id", userId),
      supabase
        .from("teacher_students")
        .select("student_id, profiles!teacher_students_student_id_fkey(id, full_name)")
        .eq("teacher_id", userId),
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("created_by", userId),
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("approved_by", userId),
    ]);

    const subjects = (subjectLinks ?? [])
      .map((l) => (Array.isArray(l.subjects) ? l.subjects[0] : l.subjects))
      .filter((s): s is { id: string; name: string } => !!s);
    const students = (studentLinks ?? [])
      .map((l) => (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles))
      .filter((p): p is { id: string; full_name: string } => !!p);

    relatedPeople = [
      { label: "Branşları", items: subjects.map((s) => ({ id: s.id, name: s.name })) },
      {
        label: "Sorumlu Olduğu Öğrenciler",
        items: students.map((s) => ({ id: s.id, name: s.full_name, href: `/admin/kullanicilar/${s.id}` })),
      },
    ];

    activityStats = [
      { label: "Eklediği Soru", value: createdCount ?? 0 },
      { label: "Onayladığı Soru", value: approvedCount ?? 0 },
      { label: "Son Aktivite", value: formatDate(lastVisit?.created_at), hint: `${pageViewCount ?? 0} sayfa görüntüleme` },
    ];
  } else if (person.role === "parent") {
    const { data: childLinks } = await supabase
      .from("parent_student_links")
      .select("student_id, profiles!parent_student_links_student_id_fkey(id, full_name, grade_level)")
      .eq("parent_id", userId);

    const children = (childLinks ?? [])
      .map((l) => (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles))
      .filter((p): p is { id: string; full_name: string; grade_level: number | null } => !!p);

    relatedPeople = [
      {
        label: "Öğrencileri",
        items: children.map((c) => ({
          id: c.id,
          name: c.full_name,
          sub: c.grade_level ? `${c.grade_level}. sınıf` : undefined,
          href: `/admin/kullanicilar/${c.id}`,
        })),
      },
    ];

    activityStats = [{ label: "Son Aktivite", value: formatDate(lastVisit?.created_at), hint: `${pageViewCount ?? 0} sayfa görüntüleme` }];
  } else {
    const { count: approvedCount } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("approved_by", userId);
    const { count: tasksCount } = await supabase
      .from("admin_tasks")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId);

    activityStats = [
      { label: "Onayladığı Soru", value: approvedCount ?? 0 },
      { label: "Oluşturduğu Görev", value: tasksCount ?? 0 },
      { label: "Son Aktivite", value: formatDate(lastVisit?.created_at), hint: `${pageViewCount ?? 0} sayfa görüntüleme` },
    ];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/kullanicilar" className="text-sm text-indigo-600">
          ← Kullanıcılara dön
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{person.full_name}</h1>
          <Badge tone={ROLE_TONE[person.role]}>{ROLE_LABEL[person.role] ?? person.role}</Badge>
          {person.is_demo && <Badge tone="amber">Test Hesabı</Badge>}
          {person.role === "teacher" && person.teacher_pending && <Badge tone="red">Onay Bekliyor</Badge>}
        </div>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Hesap / Üyelik Bilgileri</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">E-posta</dt>
            <dd className="text-slate-800">{person.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Telefon</dt>
            <dd className="text-slate-800">{person.phone ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Kayıt Tarihi</dt>
            <dd className="text-slate-800">{formatDate(person.created_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Hesap Türü</dt>
            <dd className="text-slate-800">{person.is_demo ? "Test hesabı" : "Gerçek hesap"}</dd>
          </div>
          {person.role === "student" && (
            <>
              <div>
                <dt className="text-slate-400">Sınıf</dt>
                <dd className="text-slate-800">{person.grade_level ? `${person.grade_level}. sınıf` : "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Hedef Sınav</dt>
                <dd className="text-slate-800">{person.exam_target ? EXAM_TARGET_LABEL[person.exam_target] ?? person.exam_target : "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Seviye</dt>
                <dd className="text-slate-800">
                  {person.level_label ?? "-"} {person.level_score != null ? `(${person.level_score} puan)` : ""}
                </dd>
              </div>
            </>
          )}
          {person.role === "teacher" && (
            <div>
              <dt className="text-slate-400">Başvuru Durumu</dt>
              <dd className="text-slate-800">{person.teacher_pending ? "Onay bekliyor" : "Onaylandı"}</dd>
            </div>
          )}
        </dl>
      </Card>

      {!!relatedPeople.length && (
        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">İlişkili Kişiler</h2>
          <div className="flex flex-col gap-4">
            {relatedPeople.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                {group.items.length ? (
                  <ul className="flex flex-col gap-1">
                    {group.items.map((item) => (
                      <li key={item.id} className="text-sm text-slate-700">
                        {item.href ? (
                          <Link href={item.href} className="font-medium text-indigo-600 hover:underline">
                            {item.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{item.name}</span>
                        )}
                        {item.sub && <span className="text-slate-400"> · {item.sub}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">Kayıt yok</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Aktivite Özeti</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {activityStats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} hint={s.hint} />
          ))}
        </div>
      </div>
    </div>
  );
}
