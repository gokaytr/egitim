import { createAdminClient } from "@/lib/supabase/server";

/**
 * Sistem bildirimlerinin (ogretmen basvurusu, yapilacak guncellemesi vb.)
 * gonderilecegi admin e-posta adreslerini dondurur. Once Genel Ayarlar'da
 * admin tarafindan girilen admin_notification_emails alanina bakar (virgulle
 * ayrilmis); orasi bossa role=admin olan tum kullanicilarin e-postalarina
 * duser.
 */
export async function getAdminNotificationEmails(): Promise<string[]> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("site_settings")
    .select("admin_notification_emails")
    .eq("id", true)
    .single();

  const configured = (settings?.admin_notification_emails ?? "")
    .split(",")
    .map((e: string) => e.trim())
    .filter(Boolean);

  if (configured.length) return configured;

  const { data: admins } = await admin.from("profiles").select("email").eq("role", "admin");
  return (admins ?? []).map((a) => a.email).filter((e): e is string => !!e);
}
