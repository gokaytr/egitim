"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import type { HomepageMediaItem } from "@/lib/homepage-media";

type MediaKind = "image" | "video";

const ACCEPT_BY_KIND: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
};

// Anasayfadaki tek bir medya alanini (hero ya da 6 kutudan biri) yoneten
// kart. Admin burada goersel/video secebilir, mevcut kutuphaneden bir
// dosya secebilir ya da bilgisayarindan yeni bir dosya yukleyebilir.
// Yuklenen her yeni dosya, kutuphaneye (parent'taki paylasilan liste)
// eklenir - boylece diger kutular da hemen kullanabilir.
export function HomepageMediaPicker({
  slotLabel,
  helpText,
  defaultFallbackUrl,
  initialType,
  initialUrl,
  images,
  videos,
  onLibraryUpdate,
  onSave,
}: {
  slotLabel: string;
  helpText?: string;
  defaultFallbackUrl: string;
  initialType: MediaKind;
  initialUrl: string | null;
  images: HomepageMediaItem[];
  videos: HomepageMediaItem[];
  onLibraryUpdate: (kind: MediaKind, item: HomepageMediaItem) => void;
  onSave: (type: MediaKind, url: string | null) => Promise<{ error?: string } | void>;
}) {
  const [type, setType] = useState<MediaKind>(initialType);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const options = type === "image" ? images : videos;
  const previewUrl = url ?? (type === "image" ? defaultFallbackUrl : null);
  const dirty = type !== initialType || url !== initialUrl;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);

    const isVideo = file.type.startsWith("video/");
    const kind: MediaKind = isVideo ? "video" : "image";
    const folder = kind === "image" ? "images" : "videos";
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${folder}/${Date.now()}-${safeName}`;

    setUploading(true);
    const supabase = createClient();
    const { error } = await supabase.storage.from("homepage-media").upload(path, file);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (error) {
      setStatus(`Yükleme hatası: ${error.message}`);
      return;
    }

    const { data: pub } = supabase.storage.from("homepage-media").getPublicUrl(path);
    const item: HomepageMediaItem = { url: pub.publicUrl, label: file.name };
    onLibraryUpdate(kind, item);
    setType(kind);
    setUrl(item.url);
    setStatus("Dosya yüklendi. Kaydetmeyi unutma.");
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    const result = await onSave(type, url);
    setSaving(false);
    if (result?.error) {
      setStatus(`Hata: ${result.error}`);
      return;
    }
    setStatus("Kaydedildi.");
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{slotLabel}</h3>
          {helpText && <p className="mt-0.5 text-xs text-slate-500">{helpText}</p>}
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {(["image", "video"] as MediaKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setType(k);
                setUrl(null);
              }}
              className={`rounded-md px-3 py-1 font-medium transition ${
                type === k ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {k === "image" ? "Görsel" : "Video"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="w-full max-w-[220px] shrink-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Şu an seçili</p>
          <div className="overflow-hidden rounded-lg bg-slate-900 sm:w-40">
            {previewUrl ? (
              type === "video" ? (
                <video src={previewUrl} className="aspect-video w-full object-cover" autoPlay muted loop playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="aspect-video w-full object-cover" />
              )
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-xs text-slate-400">Seçim yok</div>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500" title={url ?? undefined}>
            {url ? (options.find((o) => o.url === url)?.label ?? "Yüklenen dosya") : "Varsayılan"}
          </p>
        </div>

        <div className="flex-1">
          {options.length > 0 ? (
            <div className="grid max-h-48 grid-cols-3 gap-2.5 overflow-y-auto p-0.5 sm:grid-cols-4">
              {options.map((opt) => {
                const selected = url === opt.url;
                return (
                  <button
                    key={opt.url}
                    type="button"
                    onClick={() => setUrl(opt.url)}
                    title={opt.label}
                    className={`relative overflow-hidden rounded-md text-left transition ${
                      selected
                        ? "ring-[3px] ring-blue-600 ring-offset-2 ring-offset-white"
                        : "ring-1 ring-slate-200 hover:ring-slate-400"
                    }`}
                  >
                    {type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opt.url} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <video src={opt.url} className="aspect-video w-full bg-slate-800 object-cover" autoPlay muted loop playsInline preload="metadata" />
                    )}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-2 text-[10px] leading-tight text-white">
                      {opt.label}
                    </span>
                    {selected && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {type === "video" ? "Henüz kütüphanede video yok - aşağıdan yükleyebilirsin." : "Kütüphanede görsel bulunamadı."}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_BY_KIND[type]}
              disabled={uploading}
              onChange={handleUpload}
              className="text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
            {uploading && <span className="text-xs text-slate-400">Yükleniyor...</span>}
            <Button type="button" onClick={handleSave} disabled={saving || !dirty} className="ml-auto">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
          {status && <p className="mt-1 text-xs text-slate-500">{status}</p>}
        </div>
      </div>
    </div>
  );
}
