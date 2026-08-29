"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Topic = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  exam_types: string[] | null;
};

type Subject = { id: string; name: string };

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-manipulation rounded-full border px-3 py-1 text-xs font-medium transition ${
        active ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

// Soru ekle ekranindaki "Konu" secimini sinif -> ders -> (varsa) sinav ->
// konu sirasiyla, sekme/pill tarzinda asamali secime cevirir. Eskiden tek
// bir uzun dropdown'du (ör. "Matematik - Problemler (9. sinif)"); bircok
// sinif/ders/konu birikince bulmak zorlasiyordu.
export function TopicPickerTabs({
  value,
  onChange,
  subjectIds,
}: {
  value: string;
  onChange: (id: string) => void;
  /** Verilirse, sadece bu ders id'lerine ait ders sekmeleri gosterilir (ör. ogretmenin kendi branslari). */
  subjectIds?: string[];
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("topics").select("id, name, grade_level, subject_id, exam_types"),
      supabase.from("subjects").select("id, name").order("name"),
    ]).then(([{ data: topicRows }, { data: subjectRows }]) => {
      setTopics((topicRows as Topic[]) ?? []);
      setSubjects((subjectRows as Subject[]) ?? []);
      setLoaded(true);
    });
  }, []);

  // Disaridan gelen bir secili konu varsa (ör. form gonderildikten sonra
  // konu bilerek korunuyorsa), sekmeleri o konuya gore hizala.
  useEffect(() => {
    if (!value || !loaded) return;
    const current = topics.find((t) => t.id === value);
    if (current) {
      setSelectedGrade((g) => g ?? current.grade_level);
      setSelectedSubjectId((s) => s ?? current.subject_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, loaded]);

  const visibleSubjects = subjectIds && subjectIds.length > 0 ? subjects.filter((s) => subjectIds.includes(s.id)) : subjects;

  const topicsForGradeSubject = useMemo(() => {
    if (selectedGrade == null || !selectedSubjectId) return [];
    return topics.filter((t) => t.grade_level === selectedGrade && t.subject_id === selectedSubjectId);
  }, [topics, selectedGrade, selectedSubjectId]);

  const examTypeOptions = useMemo(() => {
    const set = new Set<string>();
    topicsForGradeSubject.forEach((t) => (t.exam_types ?? []).forEach((e) => set.add(e)));
    return Array.from(set).sort();
  }, [topicsForGradeSubject]);

  const visibleTopics = selectedExamType
    ? topicsForGradeSubject.filter((t) => (t.exam_types ?? []).includes(selectedExamType))
    : topicsForGradeSubject;

  function pickGrade(g: number) {
    setSelectedGrade(g);
    setSelectedExamType(null);
    onChange("");
  }

  function pickSubject(id: string) {
    setSelectedSubjectId(id);
    setSelectedExamType(null);
    onChange("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Sınıf</p>
        <div className="flex flex-wrap gap-1.5">
          {GRADES.map((g) => (
            <TabButton key={g} active={selectedGrade === g} onClick={() => pickGrade(g)}>
              {g}. sınıf
            </TabButton>
          ))}
        </div>
      </div>

      {selectedGrade != null && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Ders</p>
          {visibleSubjects.length === 0 ? (
            <p className="text-xs text-slate-500">Sana atanmış bir branş yok, admin panelinden branş ataması gerekiyor.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {visibleSubjects.map((s) => (
                <TabButton key={s.id} active={selectedSubjectId === s.id} onClick={() => pickSubject(s.id)}>
                  {s.name}
                </TabButton>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedGrade != null && selectedSubjectId && examTypeOptions.length > 1 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Sınav</p>
          <div className="flex flex-wrap gap-1.5">
            <TabButton active={selectedExamType === null} onClick={() => setSelectedExamType(null)}>
              Tümü
            </TabButton>
            {examTypeOptions.map((e) => (
              <TabButton key={e} active={selectedExamType === e} onClick={() => setSelectedExamType(e)}>
                {e}
              </TabButton>
            ))}
          </div>
        </div>
      )}

      {selectedGrade != null && selectedSubjectId && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Konu</p>
          {visibleTopics.length === 0 ? (
            <p className="text-xs text-slate-500">
              Bu sınıf ve ders için henüz konu eklenmemiş. Önce Müfredat sayfasından konu ekle.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {visibleTopics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange(t.id)}
                  className={`touch-manipulation rounded-lg border px-3 py-2 text-left text-sm transition ${
                    value === t.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
