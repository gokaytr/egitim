import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ruleBasedDiagnosis } from "@/lib/diagnosis/rule-based";
// NOT: Anthropic API ücretli olduğu için şimdilik ücretsiz, kural tabanlı
// değerlendirme motoru kullanılıyor. İleride tekrar AI'ya geçmek istenirse
// "@/lib/ai/anthropic" içindeki diagnoseWeakness fonksiyonu hazır bekliyor.

export async function POST(req: Request) {
  try {
    const { attemptId } = await req.json();
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId gerekli" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: attempt, error: attemptError } = await supabase
      .from("student_attempts")
      .select("id, student_id, topic_id, correct_count, wrong_count, empty_count, topics(name, grade_level)")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Deneme bulunamadı" }, { status: 404 });
    }

    const { data: logs, error: logsError } = await supabase
      .from("answer_logs")
      .select("selected_option, is_correct, error_tag, questions(body, correct_option)")
      .eq("attempt_id", attemptId)
      .eq("is_correct", false);

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    const topic = Array.isArray(attempt.topics) ? attempt.topics[0] : attempt.topics;

    // Ayni ogrencinin ayni konuda DAHA ONCE kac kez "major" (ciddi eksik)
    // cikip ciktigini sayiyoruz - tek kotu denemede degil, eksik tekrar
    // tekrar cikinca ozel ders bir secenek olarak onerilsin diye (bkz.
    // ruleBasedDiagnosis).
    const { count: priorMajorCount } = await supabase
      .from("diagnoses")
      .select("id", { count: "exact", head: true })
      .eq("student_id", attempt.student_id)
      .eq("topic_id", attempt.topic_id)
      .eq("weakness_level", "major");

    const wrongAnswers = (logs ?? []).map((l) => {
      const q = Array.isArray(l.questions) ? l.questions[0] : l.questions;
      return {
        questionBody: q?.body ?? "",
        selectedOption: l.selected_option,
        correctOption: q?.correct_option ?? "",
        errorTag: l.error_tag,
      };
    });

    const diagnosis = ruleBasedDiagnosis({
      topicName: topic?.name ?? "Genel",
      gradeLevel: topic?.grade_level ?? null,
      correctCount: attempt.correct_count,
      wrongCount: attempt.wrong_count,
      emptyCount: attempt.empty_count,
      wrongAnswers,
      priorMajorCount: priorMajorCount ?? 0,
    });

    const { data: saved, error: saveError } = await supabase
      .from("diagnoses")
      .insert({
        student_id: attempt.student_id,
        topic_id: attempt.topic_id,
        attempt_id: attempt.id,
        weakness_level: diagnosis.weakness_level ?? "minor",
        ai_summary: diagnosis.ai_summary,
        common_error_pattern: diagnosis.common_error_pattern,
        recommended_action: diagnosis.recommended_action ?? "practice_more",
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    // Not: "tutor_referral" onerisi ciksa bile burada otomatik bir
    // tutor_referrals kaydi ACILMAZ - bu artik sadece veliye sunulan bir
    // oneri. Ozel ders talebini veli isterse "Özel Ders Talebi" sayfasindaki
    // formdan kendisi olusturur (bkz. ParentTutorRequestForm).

    // student_summary (ogrenciye gosterilen kisa metin) diagnoses tablosunda
    // ayri bir sutun degil - sadece bu anlik yanita ekleniyor, veli/gecmis
    // analiz ekranlari hep detayli ai_summary'yi kullanmaya devam ediyor.
    return NextResponse.json({ diagnosis: { ...saved, student_summary: diagnosis.student_summary } });
  } catch (err) {
    console.error("/api/ai/diagnose beklenmeyen hata", err);
    return NextResponse.json({ error: "Analiz sırasında beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
