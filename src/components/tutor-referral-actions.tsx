"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Textarea, Badge } from "@/components/ui";

type Session = {
  id: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  teacher_notes: string | null;
  meeting_link: string | null;
  status: string;
};

export function TutorReferralActions({
  referralId,
  status,
  tutorId,
  currentUserId,
  sessions,
}: {
  referralId: string;
  status: string;
  tutorId: string | null;
  currentUserId: string | undefined;
  sessions: Session[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  const isMine = tutorId === currentUserId;

  async function handleClaim() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tutor_referrals")
      .update({ tutor_id: currentUserId, status: "matched" })
      .eq("id", referralId);
    setLoading(false);
    if (updateError) setError(updateError.message);
    else router.refresh();
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledAt) return setError("Tarih ve saat seçin.");
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: sessionError } = await supabase.from("tutor_sessions").insert({
      referral_id: referralId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      teacher_notes: notes || null,
      meeting_link: meetingLink || null,
      status: "planned",
    });
    if (sessionError) {
      setLoading(false);
      setError(sessionError.message);
      return;
    }
    const { error: updateError } = await supabase
      .from("tutor_referrals")
      .update({ status: "scheduled" })
      .eq("id", referralId);
    setLoading(false);
    if (updateError) setError(updateError.message);
    else {
      setScheduledAt("");
      setNotes("");
      setMeetingLink("");
      router.refresh();
    }
  }

  async function handleComplete(sessionId: string) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: sessionError } = await supabase
      .from("tutor_sessions")
      .update({ status: "completed" })
      .eq("id", sessionId);
    if (sessionError) {
      setLoading(false);
      setError(sessionError.message);
      return;
    }
    const { error: updateError } = await supabase
      .from("tutor_referrals")
      .update({ status: "completed" })
      .eq("id", referralId);
    setLoading(false);
    if (updateError) setError(updateError.message);
    else router.refresh();
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {status === "pending" && (
        <Button onClick={handleClaim} disabled={loading}>
          {loading ? "İşleniyor..." : "Üstlen"}
        </Button>
      )}

      {status === "matched" && !isMine && tutorId && (
        <p className="text-sm text-slate-500">Bu talebi başka bir öğretmen üstlendi.</p>
      )}

      {status === "matched" && isMine && (
        <form onSubmit={handleSchedule} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
          <label className="text-sm font-medium text-slate-700">Ders saatini planla</label>
          <Input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="Süre (dakika)" />
          <Input
            type="url"
            placeholder="Google Meet / Zoom linki (opsiyonel)"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
          <Textarea rows={2} placeholder="Not (opsiyonel)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Planla"}</Button>
        </form>
      )}

      {status === "scheduled" && (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">
                  {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("tr-TR") : "Tarih belirtilmedi"} · {s.duration_minutes} dk
                </p>
                {s.teacher_notes && <p className="mt-0.5 text-slate-500">{s.teacher_notes}</p>}
                {s.meeting_link && (
                  <a
                    href={s.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-block text-indigo-600 underline"
                  >
                    Canlı ders linki
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={s.status === "completed" ? "green" : "amber"}>{s.status}</Badge>
                {isMine && s.status !== "completed" && (
                  <Button onClick={() => handleComplete(s.id)} disabled={loading}>
                    Tamamlandı
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === "completed" && <Badge tone="green">Tamamlandı</Badge>}
      {status === "cancelled" && <Badge tone="red">İptal edildi</Badge>}
    </div>
  );
}
