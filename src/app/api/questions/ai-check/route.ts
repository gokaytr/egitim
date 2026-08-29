import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkQuestionQuality } from "@/lib/ai/anthropic";

export async function POST(req: Request) {
  const { questionId } = await req.json().catch(() => ({}));
  if (!questionId) {
    return NextResponse.json({ error: "questionId gerekli" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  // Onay bekleyen (is_approved=false) sorulari RLS'e gore sadece admin/
  // ogretmen/moderator okuyabiliyor - bu sorgu zaten dogal bir yetki
  // kontrolu gorevi goruyor, ayrica rol kontrolune gerek yok.
  const { data: question, error } = await supabase
    .from("questions")
    .select("id, body, options, correct_option, difficulty, topics(name, grade_level)")
    .eq("id", questionId)
    .single();

  if (error || !question) {
    return NextResponse.json({ error: "Soru bulunamadı ya da bu soruyu görme yetkin yok." }, { status: 404 });
  }

  const topic = Array.isArray(question.topics) ? question.topics[0] : question.topics;

  const result = await checkQuestionQuality({
    body: question.body,
    options: (question.options as Record<string, string>) ?? {},
    correctOption: question.correct_option,
    topicName: topic?.name ?? null,
    gradeLevel: topic?.grade_level ?? null,
    difficulty: question.difficulty ?? null,
  });

  return NextResponse.json({ result });
}
