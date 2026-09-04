import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuizRunner } from "./quiz-runner";
import { Card } from "@/components/ui";
import { LessonContentView } from "@/components/lesson-content-view";
import { getStudentQuizSettings } from "@/lib/student/quiz-settings";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";

const TEST_LABELS: Record<number, string> = { 1: "Test 1 · Kolay", 2: "Test 2 · Orta", 3: "Test 3 · Zor" };

export default async function KonuTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ test?: string }>;
}) {
  const { topicId } = await params;
  const { test: testParam } = await searchParams;
  const supabase = await createClient();
  // Admin bir test ogrenciyi onizlerken auth.uid() admin'in kendisi olur;
  // sinav ayarlarinin (sure/gosterim bicimi) onizlenen ogrenciye gore
  // uygulanmasi icin etkin ogrenci id'si kullanilmali.
  const { studentId: effectiveStudentId } = await resolveEffectiveStudent();
  const quizSettings = await getStudentQuizSettings(effectiveStudentId);

  const [{ data: topic }, { data: lessonContents }, { data: allQuestions }, { data: studentProfile }] = await Promise.all([
    supabase.from("topics").select("id, name, grade_level").eq("id", topicId).single(),
    supabase
      .from("lesson_contents")
      .select("id, title, content_md, video_url")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false }),
    // is_reference_only=true olan sorular "Referans Havuzu"nda tutulur ve
    // ogrenciye hicbir zaman gosterilmez - bkz. migration
    // 0024_soru_referans_havuzu.sql. test_number atanmis konularda (bkz.
    // migration 0033) sorular numarali test gruplarina ayrilir; atanmamis
    // (NULL) konularda eskisi gibi tek/duz bir soru listesi olarak kalir.
    supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, option_error_tags, image_url, test_number")
      .eq("topic_id", topicId)
      .eq("is_reference_only", false)
      .order("test_number", { ascending: true, nullsFirst: true })
      .limit(200),
    // Tam ekran geri sayim ekranindaki arka plan gorseli, onizlenen/gercek
    // ogrencinin sinif duzeyine gore secilsin diye (bkz. pre-quiz-countdown.tsx).
    supabase.from("profiles").select("grade_level").eq("id", effectiveStudentId).single(),
  ]);

  // Bu konunun sorulari numarali test gruplarina ayrilmis mi? (en az bir
  // soruda test_number doluysa gruplu kabul edilir - bkz. migration 0033).
  const testNumbers = Array.from(
    new Set((allQuestions ?? []).map((q) => q.test_number).filter((n): n is number => n != null)),
  ).sort((a, b) => a - b);
  const isGrouped = testNumbers.length > 0;
  const selectedTest = testParam ? Number(testParam) : null;

  const questions =
    isGrouped && selectedTest
      ? (allQuestions ?? []).filter((q) => q.test_number === selectedTest)
      : isGrouped
        ? []
        : (allQuestions ?? []).slice(0, 8);

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
      ) : isGrouped && !selectedTest ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {testNumbers.map((n) => {
            const count = (allQuestions ?? []).filter((q) => q.test_number === n).length;
            return (
              <Link key={n} href={`/ogrenci/konu/${topicId}?test=${n}`} className="block">
                <Card className="h-full transition hover:border-indigo-300 hover:shadow-sm">
                  <p className="font-semibold text-slate-900">{TEST_LABELS[n] ?? `Test ${n}`}</p>
                  <p className="mt-1 text-sm text-slate-500">{count} soru</p>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : !questions?.length ? (
        <Card>
          <p className="text-sm text-slate-600">
            Bu konuda henüz soru yok. Öğretmenin soru eklemesini bekleyin veya başka bir konu seçin.
          </p>
        </Card>
      ) : (
        <QuizRunner
          topicId={topicId}
          topicName={isGrouped && selectedTest ? `${topic?.name ?? "Konu"} · ${TEST_LABELS[selectedTest] ?? `Test ${selectedTest}`}` : topic?.name ?? "Konu"}
          questions={questions}
          quizSettings={quizSettings}
          gradeLevel={studentProfile?.grade_level}
          effectiveStudentId={effectiveStudentId}
        />
      )}
    </div>
  );
}
