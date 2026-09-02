import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyQuestionTopic, type ClassifierCandidateTopic } from "@/lib/questions/topic-classifier";

// "natural" paketi Node-only (tarayicida calismaz) oldugu icin TF-IDF
// siniflandirmasi burada, sunucu tarafinda yapiliyor. Bu route hicbir yapay
// zeka/dis servis cagirmaz - "sınıfa/konuya aktar butonu ile de tasnifini
// sistem kendi içinde yapay zekadan bağımsız yapabilmeli" talebinin karsiligi.
export const runtime = "nodejs";

type Body = {
  questionBody?: string;
  questions?: { index: number; body: string }[];
  candidateTopics?: ClassifierCandidateTopic[];
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (!profile || !["admin", "teacher", "moderator"].includes(profile.role)) {
    return NextResponse.json({ error: "Bu işlem için yetkin yok" }, { status: 403 });
  }

  const body = (await req.json()) as Body;
  const candidateTopics = body.candidateTopics ?? [];

  // Tek soru (questionBody) ya da toplu (questions[]) siniflandirma destekler
  // - toplu ise reference-pool-ai-import ekranindaki "Tümünü Sınıflandır"
  // butonu icin kullanilir.
  if (Array.isArray(body.questions)) {
    const results = body.questions.map((q) => ({
      index: q.index,
      ...classifyQuestionTopic(q.body, candidateTopics),
    }));
    return NextResponse.json({ results });
  }

  if (!body.questionBody?.trim()) {
    return NextResponse.json({ error: "questionBody veya questions gerekli" }, { status: 400 });
  }

  const result = classifyQuestionTopic(body.questionBody, candidateTopics);
  return NextResponse.json(result);
}
