"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Textarea } from "@/components/ui";
import { TopicSelect } from "@/components/topic-select";

export default function KonuAnlatimPage() {
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!topicId) {
      setStatus("Lütfen bir konu seçin.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("lesson_contents").insert({
      topic_id: topicId,
      teacher_id: userData.user?.id,
      title,
      content_md: content,
      video_url: videoUrl || null,
    });

    setLoading(false);
    if (error) {
      setStatus(`Hata: ${error.message}`);
    } else {
      setStatus("Konu anlatımı eklendi.");
      setTitle("");
      setContent("");
      setVideoUrl("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Konu Anlatımı Ekle</h1>
        <p className="text-sm text-slate-500">Öğrencilerin eksik olduğu konularda görebileceği anlatım ve video önerisi.</p>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
            <TopicSelect value={topicId} onChange={setTopicId} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ör. Türev - Temel Kavramlar" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Anlatım İçeriği</label>
            <Textarea required rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Markdown destekli anlatım metni..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Video Linki (opsiyonel)</label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
          </div>
          {status && <p className="text-sm text-slate-600">{status}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Kaydet"}</Button>
        </form>
      </Card>
    </div>
  );
}
