import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuestions } from "@/lib/ai/anthropic";

export async function POST(req: Request) {
  const { topicId, difficulty = 3, count = 5 } = await req.json();
  if (!topicId) {
    return NextResponse.json({ error: "topicId gerekli" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, name, grade_level, exam_types")
    .eq("id", topicId)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 });
  }

  const drafts = await generateQuestions({
    topicName: topic.name,
    gradeLevel: topic.grade_level,
    difficulty,
    count,
    examTypes: topic.exam_types ?? [],
  });

  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: "AI soru üretemedi, tekrar deneyin" }, { status: 502 });
  }

  const rows = drafts.map((d) => ({
    topic_id: topicId,
    created_by: userData.user!.id,
    difficulty,
    body: d.body,
    options: d.options,
    correct_option: d.correct_option,
    explanation: d.explanation,
    option_error_tags: d.option_error_tags ?? {},
    source: "ai" as const,
    is_approved: false, // öğretmen onayından geçmeden öğrenciye gösterilmez
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("questions")
    .insert(rows)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ questions: inserted });
}
