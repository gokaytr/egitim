"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui";

type Topic = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  subjects: { name: string } | { name: string }[] | null;
};

export function TopicSelect({
  value,
  onChange,
  subjectIds,
}: {
  value: string;
  onChange: (id: string) => void;
  /** Verilirse ve boş değilse, sadece bu ders id'lerine ait konular listelenir. */
  subjectIds?: string[];
}) {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("topics")
      .select("id, name, grade_level, subject_id, subjects(name)")
      .order("grade_level")
      .then(({ data }) => setTopics((data as Topic[]) ?? []));
  }, []);

  const visibleTopics = subjectIds && subjectIds.length > 0 ? topics.filter((t) => subjectIds.includes(t.subject_id)) : topics;

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Konu seçin</option>
      {visibleTopics.map((t) => {
        const subject = Array.isArray(t.subjects) ? t.subjects[0] : t.subjects;
        return (
          <option key={t.id} value={t.id}>
            {subject?.name ? `${subject.name} — ` : ""}
            {t.name} ({t.grade_level}. sınıf)
          </option>
        );
      })}
    </Select>
  );
}
