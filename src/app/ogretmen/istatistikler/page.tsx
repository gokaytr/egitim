import { StatCard } from "@/components/ui";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";
import { createClient } from "@/lib/supabase/server";

// Ogretmenin kendi katkilarina (konu anlatimi, soru, ozel ders) dair 6
// istatistik karti - eskiden Genel Bakis'in ustundeydi, artik orada yerini
// buyuk "Soru Ekle"/"Soru Onayla" kartlarina birakip buraya tasindi. Admin
// onizlemesinde de (resolveEffectiveTeacher) ayni sekilde calisir.
export default async function OgretmenIstatistiklerPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  const { teacherId: requestedTeacherId } = await searchParams;
  const { teacherId } = await resolveEffectiveTeacher(requestedTeacherId);
  const supabase = await createClient();

  const [
    { count: myLessonCount },
    { count: myQuestionCount },
    { count: myApprovedQuestionCount },
    { count: referralCount },
    { data: myTutorSessions },
  ] = await Promise.all([
    supabase.from("lesson_contents").select("*", { count: "exact", head: true }).eq("teacher_id", teacherId),
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("created_by", teacherId),
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("approved_by", teacherId),
    supabase
      .from("tutor_referrals")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "matched"]),
    // Ozel ders adedi ve toplam saati: tutor_sessions'ta ogretmen kimligi
    // dogrudan yok, tutor_referrals uzerinden bu ogretmene ait olanlari buluyoruz.
    supabase
      .from("tutor_sessions")
      .select("id, duration_minutes, tutor_referrals!inner(tutor_id)")
      .eq("tutor_referrals.tutor_id", teacherId),
  ]);

  const tutorSessionCount = myTutorSessions?.length ?? 0;
  const tutorSessionHours =
    Math.round(((myTutorSessions ?? []).reduce((s, x) => s + (x.duration_minutes ?? 0), 0) / 60) * 10) / 10;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">İstatistikler</h1>
        <p className="text-sm text-slate-500">Konu anlatımların, sorularının ve özel derslerinin özeti</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Eklediğim Konu Anlatımı" value={myLessonCount ?? 0} />
        <StatCard label="Eklediğim Soru" value={myQuestionCount ?? 0} />
        <StatCard label="Onayladığım Soru" value={myApprovedQuestionCount ?? 0} />
        <StatCard label="Bekleyen Özel Ders Talebi" value={referralCount ?? 0} />
        <StatCard label="Özel Ders Adedi" value={tutorSessionCount} />
        <StatCard label="Toplam Özel Ders Saati" value={tutorSessionHours} />
      </div>
    </div>
  );
}
