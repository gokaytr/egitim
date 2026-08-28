"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

export function AdminTaskAttachmentUpload({ taskId }: { taskId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const lowerName = file.name.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      setError("Sadece PDF veya Word (.doc/.docx) dosyası yükleyebilirsin.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const path = `${taskId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("admin-task-files").upload(path, file);
    if (uploadError) {
      setLoading(false);
      setError(`Yükleme hatası: ${uploadError.message}`);
      return;
    }

    const { error: insertError } = await supabase.from("admin_task_attachments").insert({
      task_id: taskId,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
    });

    setLoading(false);
    if (insertError) {
      setError(`Kayıt hatası: ${insertError.message}`);
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          disabled={loading}
          onChange={handleFileChange}
          className="text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        {loading && <span className="text-xs text-slate-400">Yükleniyor...</span>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
