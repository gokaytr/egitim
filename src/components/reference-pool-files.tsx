"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export type ReferencePoolFile = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
};

// Soru Havuzu'na yuklenen PDF/Word/metin dosyalarinin listesi - "PDF'ler"
// sekmesi. Dosyalar ozel (public olmayan) bir storage bucket'inda tutuldugu
// icin goruntuleme/indirme icin her seferinde kisa omurlu bir "signed URL"
// uretiliyor (dogrudan public link yok - potansiyel telifli sinav kagitlari
// oldugu icin sadece admin erisebilir).
export function ReferencePoolFiles({ files }: { files: ReferencePoolFile[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function view(file: ReferencePoolFile) {
    setBusyId(file.id);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("reference-pool-files").createSignedUrl(file.storage_path, 60);
    setBusyId(null);
    if (error || !data?.signedUrl) {
      window.alert(`Dosya açılamadı: ${error?.message ?? "bilinmeyen hata"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(file: ReferencePoolFile) {
    if (!window.confirm(`"${file.file_name}" dosyasını silmek istediğine emin misin?`)) return;
    setBusyId(file.id);
    const supabase = createClient();
    await supabase.storage.from("reference-pool-files").remove([file.storage_path]);
    await supabase.from("reference_pool_files").delete().eq("id", file.id);
    setBusyId(null);
    router.refresh();
  }

  if (files.length === 0) {
    return <p className="text-sm text-slate-500">Henüz yüklenmiş bir PDF/Word dosyası yok.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-slate-700">{files.length} dosya yüklendi.</p>
      <ul className="flex flex-col overflow-hidden rounded-lg border border-slate-100">
        {files.map((f, i) => (
          <li
            key={f.id}
            className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${i % 2 === 0 ? "bg-sky-50/70" : "bg-slate-50"}`}
          >
            <span className="font-medium text-slate-800">{f.file_name}</span>
            <span className="text-xs text-slate-400">
              {new Date(f.created_at).toLocaleDateString("tr-TR")} {new Date(f.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              disabled={busyId === f.id}
              onClick={() => view(f)}
              className="touch-manipulation text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
            >
              Görüntüle/İndir
            </button>
            <Button variant="danger" className="px-2 py-1 text-xs" disabled={busyId === f.id} onClick={() => remove(f)}>
              Sil
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
