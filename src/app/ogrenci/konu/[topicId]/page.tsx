import { createClient } from "@/lib/supabase/server";
import { QuizRunner } from "./quiz-runner";
import { Card } from "@/components/ui";
import { LessonContentView } from "@/components/lesson-content-view";

export default async function KonuTestPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const supabase = await createClient();

  const [{ data: topic }, { data: lessonContents }, { data: questions }] = await Promise.all([
    supabase.from("topics").select("id, name, grade_level").eq("id", topicId).single(),
    supabase
      .from("lesson_contents")
      .select("id, title, content_md, video_url")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false }),
    supabase
      .from("questions")
      .select("id, body, options, correct_option, option_error_tags, image_url")
      .eq("topic_id", topicId)
      .eq("is_approved", true)
      .limit(8),
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

      {!questions?.length ? (
        <Card>
          <p className="text-sm text-slate-600">
            Bu konuda henüz onaylanmış soru yok. Öğretmenin soru eklemesini bekleyin veya başka bir konu seçin.
          </p>
        </Card>
      ) : (
        <QuizRunner topicId={topicId} questions={questions} />
      )}
    </div>
  );
}
