"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import { HomepageMediaPicker } from "@/components/homepage-media-picker";
import { FEATURE_TILES, HERO_DEFAULT_IMAGE } from "@/lib/homepage-content";
import type { HomepageMediaItem } from "@/lib/homepage-media";

type MediaKind = "image" | "video";

type HeroSettings = { hero_media_type: MediaKind; hero_media_url: string | null };
type TileSettings = { tile_index: number; media_type: MediaKind; media_url: string | null };

export function HomepageAyarlarForm({
  hero,
  tiles,
  initialImages,
  initialVideos,
}: {
  hero: HeroSettings;
  tiles: TileSettings[];
  initialImages: HomepageMediaItem[];
  initialVideos: HomepageMediaItem[];
}) {
  const [images, setImages] = useState(initialImages);
  const [videos, setVideos] = useState(initialVideos);

  function handleLibraryUpdate(kind: MediaKind, item: HomepageMediaItem) {
    if (kind === "image") {
      setImages((prev) => [item, ...prev]);
    } else {
      setVideos((prev) => [item, ...prev]);
    }
  }

  async function saveHero(type: MediaKind, url: string | null) {
    const supabase = createClient();
    const { error } = await supabase
      .from("homepage_settings")
      .update({ hero_media_type: type, hero_media_url: url })
      .eq("id", true);
    return error ? { error: error.message } : {};
  }

  async function saveTile(tileIndex: number, type: MediaKind, url: string | null) {
    const supabase = createClient();
    const { error } = await supabase
      .from("homepage_tiles")
      .update({ media_type: type, media_url: url })
      .eq("tile_index", tileIndex);
    return error ? { error: error.message } : {};
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-1 font-semibold text-slate-900">Üst (Hero) Alan</h2>
        <p className="mb-3 text-sm text-slate-500">
          Anasayfanın en üstündeki, tam genişlikte görünen koyu alan. Görsel bırakabilir ya da yerine video
          koyabilirsin - hiçbir şey seçmezsen mevcut görsel kalmaya devam eder.
        </p>
        <HomepageMediaPicker
          slotLabel="Hero arka planı"
          defaultFallbackUrl={HERO_DEFAULT_IMAGE}
          initialType={hero.hero_media_type}
          initialUrl={hero.hero_media_url}
          images={images}
          videos={videos}
          onLibraryUpdate={handleLibraryUpdate}
          onSave={(type, url) => saveHero(type, url)}
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-slate-900">&quot;Odak ile neler değişir?&quot; Kutuları</h2>
        <p className="mb-3 text-sm text-slate-500">
          Anasayfadaki 6 özellik kutusunun görselini ya da videosunu tek tek değiştirebilirsin. Başlık ve açıklama
          metinleri sabit kalır.
        </p>
        <div className="flex flex-col gap-3">
          {FEATURE_TILES.map((tile, i) => {
            const tileIndex = i + 1;
            const current = tiles.find((t) => t.tile_index === tileIndex) ?? { tile_index: tileIndex, media_type: "image" as MediaKind, media_url: null };
            return (
              <HomepageMediaPicker
                key={tileIndex}
                slotLabel={`Kutu ${tileIndex}: ${tile.title}`}
                helpText={tile.desc}
                defaultFallbackUrl={tile.defaultImage}
                initialType={current.media_type}
                initialUrl={current.media_url}
                images={images}
                videos={videos}
                onLibraryUpdate={handleLibraryUpdate}
                onSave={(type, url) => saveTile(tileIndex, type, url)}
              />
            );
          })}
        </div>
      </Card>
    </div>
  );
}
