// Veli/admin raporlama ekranindaki "Genel Bakis" (son aktivite) ve
// "Gunluk Aktivite" sekmelerinin ortak veri kaynagi. Farkli tablolardan
// (quiz denemeleri, konu anlatimi izlemeleri, degerlendirmeler, ozel ders
// talepleri) gelen olaylari tek bir kronolojik akista birlestirir.

export type ActivityEventType = "attempt" | "content_view" | "diagnosis" | "referral";

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  occurredAt: string; // ISO
  topicName: string;
  description: string;
};

const WEAKNESS_LABEL: Record<string, string> = {
  none: "sorun yok",
  minor: "hafif eksik",
  major: "ciddi eksik",
};

export function buildAttemptEvent(a: {
  id: string;
  topicName: string;
  finished_at: string | null;
  started_at: string;
  correct_count: number | null;
  wrong_count: number | null;
  empty_count: number | null;
}): ActivityEvent {
  return {
    id: `attempt-${a.id}`,
    type: "attempt",
    occurredAt: a.finished_at ?? a.started_at,
    topicName: a.topicName,
    description: `"${a.topicName}" konusunda test çözdü — ${a.correct_count ?? 0} doğru, ${a.wrong_count ?? 0} yanlış, ${a.empty_count ?? 0} boş.`,
  };
}

export function buildContentViewEvent(v: { id: string; topicName: string; contentTitle: string; viewed_at: string }): ActivityEvent {
  return {
    id: `view-${v.id}`,
    type: "content_view",
    occurredAt: v.viewed_at,
    topicName: v.topicName,
    description: `"${v.topicName}" konusunda "${v.contentTitle}" konu anlatımını izledi.`,
  };
}

export function buildDiagnosisEvent(d: {
  id: string;
  topicName: string;
  weakness_level: string;
  created_at: string;
}): ActivityEvent {
  return {
    id: `diagnosis-${d.id}`,
    type: "diagnosis",
    occurredAt: d.created_at,
    topicName: d.topicName,
    description: `"${d.topicName}" konusunda değerlendirme oluşturuldu (${WEAKNESS_LABEL[d.weakness_level] ?? d.weakness_level}).`,
  };
}

export function buildReferralEvent(r: { id: string; topicName: string; requested_at: string }): ActivityEvent {
  return {
    id: `referral-${r.id}`,
    type: "referral",
    occurredAt: r.requested_at,
    topicName: r.topicName,
    description: `"${r.topicName}" konusunda özel ders talebi oluştu.`,
  };
}

export function sortEventsDesc(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function groupEventsByDay(events: ActivityEvent[]): { dateKey: string; dateLabel: string; events: ActivityEvent[] }[] {
  const sorted = sortEventsDesc(events);
  const groups: { dateKey: string; dateLabel: string; events: ActivityEvent[] }[] = [];
  for (const event of sorted) {
    const d = new Date(event.occurredAt);
    const dateKey = d.toISOString().slice(0, 10);
    let group = groups.find((g) => g.dateKey === dateKey);
    if (!group) {
      group = {
        dateKey,
        dateLabel: d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" }),
        events: [],
      };
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}
