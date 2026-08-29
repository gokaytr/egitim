import { createClient } from "@/lib/supabase/server";
import { firstOf } from "@/lib/reports/report-data";

// Admin panelindeki "Analitik" sayfasi icin, page_views tablosundan son 30
// gunun verisini cekip JS tarafinda ozetleyen fonksiyon. Diger rapor
// dosyalarindaki (report-data.ts, teacher-activity.ts) desenle ayni:
// veritabaninda groupby yapmak yerine satirlari cekip burada topluyoruz -
// bu olcekte (kucuk/orta trafik) performans sorunu yaratmaz.

export type SiteAnalytics = {
  totalPageViews: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  loggedInUsers: number;
  dailyCounts: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
  countries: { country: string; count: number }[];
  userActivity: {
    email: string;
    isNew: boolean;
    views: number;
    pages: number;
    lastSeen: string;
  }[];
};

const WINDOW_DAYS = 30;

export async function loadSiteAnalytics(): Promise<SiteAnalytics> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);
  since.setHours(0, 0, 0, 0);

  const { data: rows } = await supabase
    .from("page_views")
    .select("path, visitor_id, user_id, country, is_new_visitor, created_at, profiles(email)")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const views = rows ?? [];

  const totalPageViews = views.length;

  const visitorFirstSeen = new Map<string, boolean>();
  for (const v of views) {
    if (!visitorFirstSeen.has(v.visitor_id)) {
      visitorFirstSeen.set(v.visitor_id, v.is_new_visitor);
    }
  }
  const uniqueVisitors = visitorFirstSeen.size;
  const newVisitors = [...visitorFirstSeen.values()].filter(Boolean).length;
  const returningVisitors = uniqueVisitors - newVisitors;

  const loggedInUserIds = new Set(views.filter((v) => v.user_id).map((v) => v.user_id as string));
  const loggedInUsers = loggedInUserIds.size;

  const dailyMap = new Map<string, number>();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const v of views) {
    const key = v.created_at.slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
  }
  const dailyCounts = [...dailyMap.entries()].map(([date, count]) => ({ date, count }));

  const pageMap = new Map<string, number>();
  for (const v of views) {
    pageMap.set(v.path, (pageMap.get(v.path) ?? 0) + 1);
  }
  const topPages = [...pageMap.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const countryMap = new Map<string, number>();
  for (const v of views) {
    const c = v.country ?? "Bilinmiyor";
    countryMap.set(c, (countryMap.get(c) ?? 0) + 1);
  }
  const countries = [...countryMap.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const userMap = new Map<
    string,
    { email: string; isNew: boolean; views: number; pages: Set<string>; lastSeen: string }
  >();
  for (const v of views) {
    if (!v.user_id) continue;
    const email = firstOf(v.profiles)?.email ?? "bilinmiyor";
    const existing = userMap.get(v.user_id);
    if (existing) {
      existing.views += 1;
      existing.pages.add(v.path);
      if (v.created_at > existing.lastSeen) existing.lastSeen = v.created_at;
    } else {
      userMap.set(v.user_id, {
        email,
        isNew: v.is_new_visitor,
        views: 1,
        pages: new Set([v.path]),
        lastSeen: v.created_at,
      });
    }
  }
  const userActivity = [...userMap.values()]
    .map((u) => ({ email: u.email, isNew: u.isNew, views: u.views, pages: u.pages.size, lastSeen: u.lastSeen }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 50);

  return {
    totalPageViews,
    uniqueVisitors,
    newVisitors,
    returningVisitors,
    loggedInUsers,
    dailyCounts,
    topPages,
    countries,
    userActivity,
  };
}
