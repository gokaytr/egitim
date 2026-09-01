import { createClient } from "@/lib/supabase/server";

// Anasayfa hero alaninda ve "Odak ile neler degisir?" kutularinda halihazirda
// kullanilan, projeyle birlikte gelen (public/grade-bg altindaki) sabit
// gorseller. Admin panelindeki "Gorsel Sec" listesinde bunlar her zaman
// gorunur - boylece yeni bir sey yuklemeden de secim yapilabilir ve mevcut
// gorseller asla kaybolmaz.
export const STATIC_HOMEPAGE_IMAGES: { url: string; label: string }[] = [
  { url: "/grade-bg/varsayilan.jpg", label: "Varsayılan (hero)" },
  { url: "/grade-bg/ilkokul-1.jpg", label: "İlkokul 1" },
  { url: "/grade-bg/ilkokul-2.jpg", label: "İlkokul 2" },
  { url: "/grade-bg/ilkokul-3.jpg", label: "İlkokul 3" },
  { url: "/grade-bg/ortaokul-1.jpg", label: "Ortaokul 1" },
  { url: "/grade-bg/ortaokul-2.jpg", label: "Ortaokul 2" },
  { url: "/grade-bg/lise-1.jpg", label: "Lise 1" },
];

export type HomepageMediaItem = { url: string; label: string };

const BUCKET = "homepage-media";

function publicUrlFor(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

// Supabase Storage'daki "homepage-media" bucket'inin images/ ve videos/
// klasorlerini listeler. Admin daha once buradan bir dosya yuklediyse,
// secim listelerinde (gorsel/video) bu dosyalar da gorunur.
export async function listHomepageMediaLibrary(): Promise<{
  images: HomepageMediaItem[];
  videos: HomepageMediaItem[];
}> {
  const supabase = await createClient();

  const [imagesRes, videosRes] = await Promise.all([
    supabase.storage.from(BUCKET).list("images", { sortBy: { column: "created_at", order: "desc" } }),
    supabase.storage.from(BUCKET).list("videos", { sortBy: { column: "created_at", order: "desc" } }),
  ]);

  const images = (imagesRes.data ?? [])
    .filter((f) => f.name && f.id) // klasor girdilerini (id=null) disla
    .map((f) => ({ url: publicUrlFor(`images/${f.name}`), label: f.name }));

  const videos = (videosRes.data ?? [])
    .filter((f) => f.name && f.id)
    .map((f) => ({ url: publicUrlFor(`videos/${f.name}`), label: f.name }));

  return { images, videos };
}
