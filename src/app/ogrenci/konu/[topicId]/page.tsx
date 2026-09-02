import { createClient } from "@/lib/supabase/server";
import { QuizRunner } from "./quiz-runner";
import { Card } from "@/components/ui";
import { LessonContentView } from "@/components/lesson-content-view";
import { getStudentQuizSettings } from "@/lib/student/quiz-settings";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";

export default async function KonuTestPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const supabase = await createClient();
  // Admin bir test ogrenciyi onizlerken auth.uid() admin'in kendisi olur;
  // sinav ayarlarinin (sure/gosterim bicimi) onizlenen ogrenciye gore
  // uygulanmasi icin etkin ogrenci id'si kullanilmali.
  const { studentId: effectiveStudentId } = await resolveEffectiveStudent();
  const quizSettings = await getStudentQuizSettings(effectiveStudentId);

  const [{ data: topic }, { data: lessonContents }, { data: questions }, { data: studentProfile }] = await Promise.all([
    supabase.from("topics").select("id, name, grade_level").eq("id", topicId).single(),
    supabase
      .from("lesson_contents")
      .select("id, title, content_md, video_url")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false }),
    // is_reference_only=true olan sorular "Referans Havuzu"nda tutulur ve
    // ogrenciye hicbir zaman gosterilmez - bkz. migration
    // 0024_soru_referans_havuzu.sql.
    supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, option_error_tags, image_url")
      .eq("topic_id", topicId)
      .eq("is_reference_only", false)
      .limit(8),
    // Tam ekran geri sayim ekranindaki arka plan gorseli, onizlenen/gercek
    // ogrencinin sinif duzeyine gore secilsin diye (bkz. pre-quiz-countdown.tsx).
    supabase.from("profiles").select("grade_level").eq("id", effectiveStudentId).single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{topic?.name}</h1>
        <p className="text-sm text-slate-500">Cevaplarına göre eksiklerin otomatik olarak tespit edilecek.</p>
      </div>

      {lessonContents?.map((lc) => (
        <Card key={lc.id}>
          <LessonContentView contentId={lc.id} />
          <h2 className="mb-2 font-semibold text-slate-900">{lc.title}</h2>
          <p className="whitespace-pre-line text-sm text-slate-700">{lc.content_md}</p>
          {lc.video_url && (
            <a href={lc.video_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-indigo-600">
              Video anlatımı izle →
            </a>
          )}
        </Card>
      ))}

      {studentProfile?.grade_level == null ? (
        <Card>
          <p className="text-sm text-amber-600">
            Bu konudaki soruları görebilmen için önce Genel Ayarlar&apos;dan sınıf ve hedef sınav bilgini
            tamamlaman gerekiyor.
          </p>
        </Card>
      ) : !questions?.length ? (
        <Card>
          <p className="text-sm text-slate-600">
            Bu konuda henüz soru yok. Öğretmenin soru eklemesini bekleyin veya başka bir konu seçin.
          </p>
        </Card>
      ) : (
        <QuizRunner
          topicId={topicId}
          topicName={topic?.name ?? "Konu"}
          questions={questions}
          quizSettings={quizSettings}
          gradeLevel={studentProfile?.grade_level}
          effectiveStudentId={effectiveStudentId}
        />
      )}
    </div>
  );
}
