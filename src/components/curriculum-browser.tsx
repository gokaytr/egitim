import { Card } from "@/components/ui";

export type CurriculumTopicRow = {
  id: string;
  name: string;
  grade_level: number | null;
  exam_types: string[] | null;
  subjectName: string;
};

export function CurriculumBrowser({ topics }: { topics: CurriculumTopicRow[] }) {
  const grades = Array.from({ length: 12 }, (_, i) => i + 1);
  const anyTopics = topics.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {!anyTopics && (
        <Card>
          <p className="text-sm text-slate-500">Henüz konu eklenmemiş.</p>
        </Card>
      )}
      {grades.map((grade) => {
        const gradeTopics = topics.filter((t) => t.grade_level === grade);
        if (!gradeTopics.length) return null;

        const bySubject = new Map<string, CurriculumTopicRow[]>();
        for (const t of gradeTopics) {
          const arr = bySubject.get(t.subjectName) ?? [];
          arr.push(t);
          bySubject.set(t.subjectName, arr);
        }

        return (
          <Card key={grade}>
            <h2 className="mb-3 font-semibold text-slate-900">{grade}. Sınıf</h2>
            <div className="flex flex-col gap-3">
              {Array.from(bySubject.entries()).map(([subjectName, ts]) => (
                <div key={subjectName}>
                  <p className="mb-1 text-sm font-medium text-slate-700">{subjectName}</p>
                  <ul className="flex flex-col gap-1">
                    {ts.map((t) => (
                      <li key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span>{t.name}</span>
                        {t.exam_types && t.exam_types.length > 0 && (
                          <span className="text-xs text-slate-500">{t.exam_types.join(", ")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
