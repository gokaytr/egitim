import { createClient } from "@/lib/supabase/server";

// Admin'in Genel Ayarlar'dan actigi/kapattigi demo veri gorunurlugu bayragi.
// Kapatildiginda demo (profiles.is_demo = true) kayitlar admin listelerinden
// gizlenir - veri silinmez, sadece admin gorunumunden cikar.
export async function getShowDemoData(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("show_demo_data").eq("id", true).single();
  return data?.show_demo_data ?? true;
}
