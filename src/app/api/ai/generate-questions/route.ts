import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuestions } from "@/lib/ai/anthropic";
import { isQuestionDifficulty } from "@/lib/questions/difficulty";

export async function POST(req: Request) {
  const { topicId, difficulty = "orta", count = 5 } = await req.json();
  if (!topicId) {
    return NextResponse.json({ error: "topicId gerekli" }, { status: 400 });
  }
  if (!isQuestionDifficulty(difficulty)) {
    return NextResponse.json({ error: "Geçersiz zorluk kademesi" }, { status: 400 });
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

  // Soru Havuzu'nda (is_reference_only=true) bu konuya ait gercek sinav
  // sorulari varsa, birkacini AI'ya tarz/zorluk referansi olarak veriyoruz -
  // "soru üretirken buradaki bilgiyi inceleyip ona göre soru üretebilmeli"
  // talebi. Basit ve deterministik: embedding/benzerlik siralamasi yok,
  // sadece ayni topic_id ile dogrudan eslesen en fazla 4 ornek.
  const { data: referenceRows } = await supabase
    .from("questions")
    .select("body, options, correct_option")
    .eq("topic_id", topicId)
    .eq("is_reference_only", true)
    .limit(4);

  const drafts = await generateQuestions({
    topicName: topic.name,
    gradeLevel: topic.grade_level,
    difficulty,
    count,
    examTypes: topic.exam_types ?? [],
    referenceExamples: (referenceRows ?? []) as { body: string; options: Record<string, string>; correct_option: string }[],
  });

  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: "AI soru üretemedi, tekrar deneyin" }, { status: 502 });
  }

  // Her sorunun bir cozum aciklamasi olmasi zorunlu (bkz. CLAUDE.md "Soru
  // cevap aciklamasi kurali") - aciklamasiz gelen taslaklar (nadiren AI
  // atlarsa) ogretmene onay icin bile gitmesin diye elenir.
  const validDrafts = drafts.filter((d) => typeof d.explanation === "string" && d.explanation.trim());
  if (!validDrafts.length) {
    return NextResponse.json(
      { error: "AI'nin ürettiği sorularda çözüm açıklaması eksik, tekrar deneyin." },
      { status: 502 }
    );
  }

  const rows = validDrafts.map((d) => ({
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
