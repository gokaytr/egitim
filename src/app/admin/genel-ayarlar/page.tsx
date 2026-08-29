import { createClient } from "@/lib/supabase/server";
import { SiteSettingsForm } from "@/components/site-settings-form";
import { AdminAllowlistForm } from "./admin-allowlist-form";

export default async function GenelAyarlarPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("site_name, support_email, maintenance_mode, show_demo_data, admin_notification_emails")
    .eq("id", true)
    .single();
  const { data: allowlist } = await supabase.from("admin_allowlist").select("email").order("email", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Genel Ayarlar</h1>
        <p className="text-sm text-slate-500">Platform genelinde geçerli olan temel ayarlar.</p>
      </div>
      <SiteSettingsForm settings={settings ?? { site_name: "Odak", support_email: null, maintenance_mode: false, show_demo_data: true, admin_notification_emails: null }} />
      <AdminAllowlistForm emails={allowlist?.map((a) => a.email) ?? []} />
    </div>
  );
}
