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
    .select("id, name, grade_level, exam_types, subjects(name)")
    .eq("id", topicId)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 });
  }

  const topicSubject = topic.subjects as { name: string } | { name: string }[] | null;
  const subjectName = Array.isArray(topicSubject) ? topicSubject[0]?.name ?? null : topicSubject?.name ?? null;

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
    subjectName,
    referenceExamples: (referenceRows ?? []) as { body: string; options: Record<string, string>; correct_option: string }[],
  });

  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: "AI soru üretemedi, tekrar deneyin" }, { status: 502 });
  }

  // Her sorunun bir cozum aciklamasi olmasi zorunlu (bkz. CLAUDE.md "Soru
  // cevap aciklamasi kurali") - aciklamasiz gelen taslaklar (nadiren AI
  // atlarsa) ogretmene onay icin bile gitmesin diye elenir.
  const withExplanation = drafts.filter((d) => typeof d.explanation === "string" && d.explanation.trim());

  // question-quality.md'deki 80 puan kabul esigi: AI kendi puanladigi
  // (quality_score) taslaklardan 80'in altinda olanlari veritabanina hic
  // yazmadan eliyoruz - bu, AI'nin kendi puanlamasina ek bir sunucu-taraflı
  // guvenlik agidir. quality_score alani gelmemisse (eski/beklenmedik
  // yanit) reddetmek yerine gecirmeye devam ediyoruz - eksik alan yuzunden
  // hicbir sorunun uretilememesi daha kotu bir sonuc olur.
  const QUALITY_THRESHOLD = 80;
  const validDrafts = withExplanation.filter(
    (d) => typeof d.quality_score !== "number" || d.quality_score >= QUALITY_THRESHOLD
  );
  const rejectedForQuality = withExplanation.length - validDrafts.length;

  if (!validDrafts.length) {
    return NextResponse.json(
      { error: "AI'nin ürettiği sorular kalite kontrolünden geçemedi (açıklama eksik ya da kalite puanı düşük), tekrar deneyin." },
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
    quality_score: typeof d.quality_score === "number" ? d.quality_score : null,
    cognitive_level: typeof d.cognitive_level === "string" ? d.cognitive_level : null,
    question_type: typeof d.question_type === "string" ? d.question_type : null,
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

  return NextResponse.json({ questions: inserted, rejected_for_quality: rejectedForQuality });
}
