import { createClient } from "@/lib/supabase/server";
import { QuizRunner } from "./quiz-runner";
import { Card } from "@/components/ui";

export default async function KonuTestPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase.from("topics").select("id, name, grade_level").eq("id", topicId).single();
  const { data: questions } = await supabase
    .from("questions")
    .select("id, body, options, correct_option, option_error_tags")
    .eq("topic_id", topicId)
    .eq("is_approved", true)
    .limit(8);

  if (!questions?.length) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          Bu konuda henüz onaylanmış soru yok. Öğretmenin soru eklemesini bekleyin veya başka bir konu seçin.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{topic?.name} — Seviye Testi</h1>
        <p className="text-sm text-slate-500">Cevaplarına göre eksiklerin otomatik olarak tespit edilecek.</p>
      </div>
      <QuizRunner topicId={topicId} questions={questions} />
    </div>
  );
}
