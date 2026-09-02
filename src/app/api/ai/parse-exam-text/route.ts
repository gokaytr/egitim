import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseExamText, type ExamParseCandidateTopic } from "@/lib/ai/anthropic";

// Admin'in Soru Havuzu ekranindan HAM (PDF'den kopyalanmis, bozuk bosluklu)
// sinav metnini yapay zekaya gonderip soru+cevap+konu olarak yapilandirir.
// Bu route veritabanina HICBIR SEY YAZMAZ - sadece taslak dondurur, admin
// onceden gozden gecirip "Soruları Ekle" dedikten sonra istemci tarafinda
// (ReferencePoolAiImport) is_reference_only=true olarak kaydedilir.
export async function POST(req: Request) {
  const { rawText, answerKeyText, candidateTopics } = await req.json();

  if (typeof rawText !== "string" || !rawText.trim()) {
    return NextResponse.json({ error: "rawText gerekli" }, { status: 400 });
  }
  if (!Array.isArray(candidateTopics)) {
    return NextResponse.json({ error: "candidateTopics gerekli" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Bu işlem sadece admin için" }, { status: 403 });
  }

  const result = await parseExamText({
    rawText,
    answerKeyText: typeof answerKeyText === "string" ? answerKeyText : undefined,
    candidateTopics: candidateTopics as ExamParseCandidateTopic[],
  });

  if (!result.questions.length && !result.skipped.length) {
    return NextResponse.json({ error: "Yapay zeka metni ayrıştıramadı, tekrar deneyin" }, { status: 502 });
  }

  return NextResponse.json(result);
}
