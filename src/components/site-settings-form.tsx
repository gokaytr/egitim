"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Textarea } from "@/components/ui";

type Settings = {
  site_name: string;
  support_email: string | null;
  maintenance_mode: boolean;
  show_demo_data: boolean;
  admin_notification_emails: string | null;
  require_question_approval: boolean;
};

export function SiteSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [siteName, setSiteName] = useState(settings.site_name);
  const [supportEmail, setSupportEmail] = useState(settings.support_email ?? "");
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenance_mode);
  const [showDemoData, setShowDemoData] = useState(settings.show_demo_data);
  const [adminEmails, setAdminEmails] = useState(settings.admin_notification_emails ?? "");
  const [requireQuestionApproval, setRequireQuestionApproval] = useState(settings.require_question_approval);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("site_settings")
      .update({
        site_name: siteName,
        support_email: supportEmail || null,
        maintenance_mode: maintenanceMode,
        show_demo_data: showDemoData,
        admin_notification_emails: adminEmails.trim() || null,
        require_question_approval: requireQuestionApproval,
      })
      .eq("id", true);
    setLoading(false);
    if (error) {
      setStatus(`Hata: ${error.message}`);
      return;
    }
    setStatus("Ayarlar kaydedildi.");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Genel Ayarlar</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Platform adı</label>
          <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Destek e-postası</label>
          <Input type="email" placeholder="destek@odak-egitim.com" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Sistem bildirimi alacak admin e-postaları</label>
          <Textarea
            rows={2}
            placeholder="ornek1@mail.com, ornek2@mail.com"
            value={adminEmails}
            onChange={(e) => setAdminEmails(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">
            Öğretmen başvurusu, yapılacak eklenmesi/güncellenmesi gibi bildirimler buraya gönderilir. Virgülle birden
            fazla adres yazabilirsin. Boş bırakılırsa, rolü &quot;Yönetici&quot; olan tüm kullanıcıların e-postalarına gider.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
          Bakım modu (şu an yalnızca bilgi amaçlı bir bayrak; sayfaları otomatik kapatmaz)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={showDemoData} onChange={(e) => setShowDemoData(e.target.checked)} />
          Demo/test verilerini göster (öğrenci, öğretmen, veli hesapları ve içerikleri) — kapatınca listelerden gizlenir, silinmez.
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={requireQuestionApproval}
            onChange={(e) => setRequireQuestionApproval(e.target.checked)}
          />
          Sadece onaylı sorular öğrenciye/veliye gösterilsin — kapalıyken (varsayılan) onay bekleyen sorular da
          öğrenciye görünmeye devam eder; reddedilmiş sorular bu ayardan bağımsız olarak her zaman gizlenir.
        </label>
        <Button type="submit" disabled={loading} className="self-start">
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </form>
      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
    </Card>
  );
}
