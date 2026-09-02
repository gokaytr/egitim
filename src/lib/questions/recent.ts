import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionDifficulty } from "@/lib/questions/difficulty";
import type { RecentQuestion } from "@/components/recent-questions-card";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

type RawRow = {
  id: string;
  body: string;
  options: Record<string, string> | null;
  correct_option: string;
  explanation: string | null;
  difficulty: QuestionDifficulty | null;
  is_approved: boolean;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  approved_at: string | null;
  follows_new_policy: boolean | null;
  topics:
    | { name: string; subjects: { name: string } | { name: string }[] | null }
    | { name: string; subjects: { name: string } | { name: string }[] | null }[]
    | null;
};

function mapRow(q: RawRow, sortDate: string): RecentQuestion {
  const topic = firstOf(q.topics);
  const subject = topic ? firstOf(topic.subjects) : undefined;
  return {
    id: q.id,
    body: q.body,
    options: (q.options ?? {}) as Record<string, string>,
    correct_option: q.correct_option,
    explanation: q.explanation,
    difficulty: q.difficulty,
    is_approved: q.is_approved,
    approved_by: q.approved_by,
    created_by: q.created_by,
    sort_date: sortDate,
    subject_name: subject?.name ?? "Diğer",
    topic_name: topic?.name ?? "Konu",
    follows_new_policy: q.follows_new_policy ?? false,
  };
}

const SELECT_ALL =
  "id, body, options, correct_option, explanation, difficulty, is_approved, approved_by, created_by, created_at, approved_at, follows_new_policy, topics(name, subjects(name))";
const SELECT_SCOPED =
  "id, body, options, correct_option, explanation, difficulty, is_approved, approved_by, created_by, created_at, approved_at, follows_new_policy, topics!inner(name, subject_id, subjects(name))";

export type RecentQuestionActivity = {
  added: RecentQuestion[];
  approved: RecentQuestion[];
};

// Genel Bakis'taki "Son Eklenen/Onaylanan Sorular" karti icin, "eklenenler"
// (created_at'e gore) ve "onaylananlar" (approved_at'e gore) AYRI iki liste
// dondurur - kullanicinin talebiyle bu ikisi artik tek bir karma liste
// yerine iki ayri sekmede gosteriliyor. subjectIds verilirse (ogretmen
// paneli) sadece o branslardaki sorular gelir; null verilirse (admin
// paneli) tum sorular gelir.
export async function getRecentQuestionActivity(
  supabase: SupabaseClient,
  subjectIds: string[] | null,
  limit = 10
): Promise<RecentQuestionActivity> {
  let createdRes;
  let approvedRes;

  if (subjectIds && subjectIds.length > 0) {
    [createdRes, approvedRes] = await Promise.all([
      supabase.from("questions").select(SELECT_SCOPED).in("topics.subject_id", subjectIds).order("created_at", { ascending: false }).limit(limit),
      supabase
        .from("questions")
        .select(SELECT_SCOPED)
        .in("topics.subject_id", subjectIds)
        .not("approved_at", "is", null)
        .order("approved_at", { ascending: false })
        .limit(limit),
    ]);
  } else {
    [createdRes, approvedRes] = await Promise.all([
      supabase.from("questions").select(SELECT_ALL).order("created_at", { ascending: false }).limit(limit),
      supabase.from("questions").select(SELECT_ALL).not("approved_at", "is", null).order("approved_at", { ascending: false }).limit(limit),
    ]);
  }

  const added = ((createdRes.data ?? []) as unknown as RawRow[]).map((raw) => mapRow(raw, raw.created_at));
  const approved = ((approvedRes.data ?? []) as unknown as RawRow[]).map((raw) => mapRow(raw, raw.approved_at ?? raw.created_at));

  return { added, approved };
}
