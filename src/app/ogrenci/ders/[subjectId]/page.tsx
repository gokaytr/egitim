import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { TopicActions } from "@/components/topic-actions";

export default async function DersPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("id", userData.user?.id)
    .single();

  const [{ data: subject }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("id, name, category").eq("id", subjectId).single(),
    supabase
      .from("topics")
      .select("id, name, grade_level, exam_types, difficulty_level, estimated_minutes")
      .eq("subject_id", subjectId)
      .eq("grade_level", profile?.grade_level ?? -1)
      .order("order_index"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ogrenci" className="text-sm text-indigo-600">← Derslere dön</Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{subject?.name ?? "Ders"}</h1>
        <p className="text-sm text-slate-500">Bu dersin konularını seç, kendini test et ya da çalışma programına ekle.</p>
      </div>

      {!topics?.length && (
        <Card>
          <p className="text-sm text-slate-500">
            {profile?.grade_level}. sınıf için bu derste henüz konu eklenmemiş. Öğretmen içerik ekledikçe burada görünecek.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {topics?.map((t) => (
          <Card key={t.id}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">{t.name}</h2>
              <Badge>{t.grade_level}. sınıf</Badge>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              {t.exam_types?.join(", ") || "genel"} · ~{t.estimated_minutes} dk · zorluk {t.difficulty_level}/5
            </p>
            <TopicActions topicId={t.id} />
          </Card>
        ))}
      </div>
    </div>
  );
}
