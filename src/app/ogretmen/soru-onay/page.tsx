import { createClient } from "@/lib/supabase/server";
import { ApproveButton } from "@/components/approve-button";
import { AiCheckButton } from "@/components/ai-check-button";
import { Card, Badge } from "@/components/ui";

export default async function OgretmenSoruOnayPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: subjectRows } = await supabase
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", userData.user?.id ?? "");
  const subjectIds = (subjectRows ?? []).map((r) => r.subject_id);

  let pending: {
    id: string;
    body: string;
    options: unknown;
    correct_option: string;
    source: string;
    difficulty: number;
    topics: { name: string; subject_id: string } | { name: string; subject_id: string }[] | null;
  }[] = [];

  if (subjectIds.length > 0) {
    const { data } = await supabase
      .from("questions")
      .select("id, body, options, correct_option, source, difficulty, topics!inner(name, subject_id)")
      .eq("is_approved", false)
      .in("topics.subject_id", subjectIds)
      .order("created_at", { ascending: false });
    pending = data ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soru Onayı</h1>
        <p className="text-sm text-slate-500">Yapay zekanın sizin branşınızda ürettiği sorular, öğrencilere gösterilmeden önce burada onaylanır.</p>
      </div>

      <div className="flex flex-col gap-4">
        {subjectIds.length === 0 && (
          <p className="text-sm text-amber-700">Size henüz bir branş atanmamış. Soru onaylayabilmeniz için admin panelinden bir branş atanması gerekiyor.</p>
        )}
        {pending.map((q) => {
          const topic = Array.isArray(q.topics) ? q.topics[0] : q.topics;
          const options = q.options as Record<string, string>;
          return (
            <Card key={q.id}>
              <div className="mb-2 flex items-center gap-2">
                <Badge tone="amber">{q.source === "ai" ? "AI üretimi" : q.source}</Badge>
                <Badge>{topic?.name}</Badge>
                <Badge>Zorluk {q.difficulty}/5</Badge>
              </div>
              <p className="font-medium text-slate-900">{q.body}</p>
              <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-600 md:grid-cols-2">
                {Object.entries(options ?? {}).map(([key, val]) => (
                  <li key={key} className={key === q.correct_option ? "font-semibold text-emerald-700" : ""}>
                    {key}) {val}
                  </li>
                ))}
              </ul>
              <AiCheckButton questionId={q.id} />
              <ApproveButton questionId={q.id} />
            </Card>
          );
        })}
        {subjectIds.length > 0 && !pending.length && <p className="text-sm text-slate-500">Onay bekleyen soru yok.</p>}
      </div>
    </div>
  );
}
