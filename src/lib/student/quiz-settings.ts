import { createClient } from "@/lib/supabase/server";
import { DEFAULT_QUIZ_DISPLAY_SETTINGS, type QuizDisplaySettings } from "@/components/question-answer-list";

// Ogrencinin deneme/konu testi ekranlarinda soru basi sure siniri ve
// gosterim bicimi (kaydirmali liste / sayfa basi bir soru) tercihlerini
// tuttugu satir. Hic kaydi yoksa (ilk kez kullaniyor ya da veli/onizleme
// gibi ayarlanamayan bir baglamda) varsayilan degerlere dusulur.
export async function getStudentQuizSettings(studentId: string | undefined): Promise<QuizDisplaySettings> {
  if (!studentId) return DEFAULT_QUIZ_DISPLAY_SETTINGS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_quiz_settings")
    .select("timer_enabled, seconds_per_question, one_question_per_page, font_size, font_family")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!data) return DEFAULT_QUIZ_DISPLAY_SETTINGS;

  return {
    timerEnabled: data.timer_enabled,
    secondsPerQuestion: data.seconds_per_question,
    oneQuestionPerPage: data.one_question_per_page,
    fontSize: (data.font_size as QuizDisplaySettings["fontSize"]) ?? DEFAULT_QUIZ_DISPLAY_SETTINGS.fontSize,
    fontFamily: (data.font_family as QuizDisplaySettings["fontFamily"]) ?? DEFAULT_QUIZ_DISPLAY_SETTINGS.fontFamily,
  };
}
