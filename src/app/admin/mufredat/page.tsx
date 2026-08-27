import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";

export default async function MufredatPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, category, topics(id, name, grade_level, exam_types, difficulty_level)")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Müfredat</h1>
        <p className="text-sm text-slate-500">
          1. sınıftan 12. sınıfa ders/konu ağacı — yeni ders ve konu eklemek için öğretmen panelini kullanın.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {subjects?.map((s) => (
          <Card key={s.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{s.name}</h2>
              <Badge>{s.category}</Badge>
            </div>
            <ul className="flex flex-col gap-2">
              {s.topics?.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{t.name} <span className="text-slate-400">· {t.grade_level}. sınıf</span></span>
                  <span className="text-xs text-slate-500">{t.exam_types?.join(", ")}</span>
                </li>
              ))}
              {!s.topics?.length && <p className="text-sm text-slate-400">Konu eklenmemiş.</p>}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
