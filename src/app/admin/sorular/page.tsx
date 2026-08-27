import { createClient } from "@/lib/supabase/server";
import { ApproveButton } from "./approve-button";
import { Card, Badge } from "@/components/ui";

export default async function SoruOnayPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("questions")
    .select("id, body, options, correct_option, source, difficulty, topics(name)")
    .eq("is_approved", false)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soru Onayı</h1>
        <p className="text-sm text-slate-500">Yapay zekanın ürettiği sorular, öğrencilere gösterilmeden önce burada onaylanır.</p>
      </div>

      <div className="flex flex-col gap-4">
        {pending?.map((q) => {
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
              <ApproveButton questionId={q.id} />
            </Card>
          );
        })}
        {!pending?.length && <p className="text-sm text-slate-500">Onay bekleyen soru yok.</p>}
      </div>
    </div>
  );
}
