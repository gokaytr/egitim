"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui";

type Topic = { id: string; name: string; grade_level: number | null; subjects: { name: string } | { name: string }[] | null };

export function TopicSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("topics")
      .select("id, name, grade_level, subjects(name)")
      .order("grade_level")
      .then(({ data }) => setTopics((data as Topic[]) ?? []));
  }, []);

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Konu seçin</option>
      {topics.map((t) => {
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
