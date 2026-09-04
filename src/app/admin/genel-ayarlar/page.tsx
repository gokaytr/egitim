import { createClient } from "@/lib/supabase/server";
import { SiteSettingsForm } from "@/components/site-settings-form";
import { AdminAllowlistForm } from "./admin-allowlist-form";
import { SimpleTabs } from "@/components/simple-tabs";
import { Card, Badge } from "@/components/ui";
import { DOC_SECTIONS, DEMO_ACCOUNTS } from "@/lib/docs/content";
import { HomepageAyarlarForm } from "@/components/homepage-ayarlar-form";
import { listHomepageMediaLibrary } from "@/lib/homepage-media";

const ROLE_ORDER: Array<"admin" | "teacher" | "parent" | "student"> = ["admin", "teacher", "parent", "student"];

export default async function GenelAyarlarPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("site_name, support_email, maintenance_mode, show_demo_data, admin_notification_emails, require_question_approval")
    .eq("id", true)
    .single();
  const { data: allowlist } = await supabase.from("admin_allowlist").select("email").order("email", { ascending: true });

  const [{ data: heroSettings }, { data: tileSettings }, mediaLibrary] = await Promise.all([
    supabase.from("homepage_settings").select("hero_media_type, hero_media_url").eq("id", true).single(),
    supabase.from("homepage_tiles").select("tile_index, media_type, media_url").order("tile_index", { ascending: true }),
    listHomepageMediaLibrary(),
  ]);

  const ayarlarTab = (
    <div className="flex flex-col gap-6">
      <SiteSettingsForm
        settings={
          settings ?? {
            site_name: "Odak",
            support_email: null,
            maintenance_mode: false,
            show_demo_data: true,
            admin_notification_emails: null,
            require_question_approval: false,
          }
        }
      />
      <AdminAllowlistForm emails={allowlist?.map((a) => a.email) ?? []} />
    </div>
  );

  const sistemBilgisiTab = (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Geliştirme Süreci — Kullanılan AI Araçları</h2>
        <p className="mb-3 text-sm text-slate-500">
          Bu not, platformun canlı bir özelliğini değil, kod tabanının Claude ile geliştirilme sürecinde kullanılan
          yardımcı araçları açıklar — öğrenci, öğretmen veya veli deneyimini doğrudan etkilemez.
        </p>
        <ul className="flex flex-col gap-3">
          <li className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge>PDF Analiz</Badge>
              <span className="font-medium text-slate-800">Gerçek sınav kitapçıklarından referans alma</span>
            </div>
            <p className="mt-1 text-slate-600">
              Yayınevi/ÖSYM tarzı gerçek sınav kitapçıkları PDF olarak paylaşıldığında, soru üretim standardını bu
              örneklere göre kalibre etmek için kullanılır.
            </p>
          </li>
          <li className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge>Otomatik Web Testi</Badge>
              <span className="font-medium text-slate-800">Yayın öncesi tarayıcı kontrolü</span>
            </div>
            <p className="mt-1 text-slate-600">
              Büyük bir arayüz değişikliğinden sonra, siteyi gerçek bir tarayıcıda gezip mobil/masaüstü görünümdeki
              hataları (ör. üst üste binen butonlar) fark etmek için kullanılır.
            </p>
          </li>
          <li className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge>Beceri Şablonu</Badge>
              <span className="font-medium text-slate-800">Tutarlı soru yazım standardı</span>
            </div>
            <p className="mt-1 text-slate-600">
              &quot;Yayınevi kalitesinde soru yazım standardı&quot; gibi tekrar eden talimatları kalıcı bir şablon haline
              getirip, her seferinde yeniden anlatmaya gerek kalmadan tutarlı şekilde uygulamak için kullanılır.
            </p>
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Demo Hesaplar</h2>
        <p className="mb-3 text-sm text-slate-500">
          Sistemi test etmek için aşağıdaki hazır hesapları kullanabilirsin.
        </p>
        <ul className="flex flex-col gap-3">
          {DEMO_ACCOUNTS.map((acc) => (
            <li key={acc.email} className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge>{acc.role}</Badge>
                <span className="font-medium text-slate-800">{acc.note}</span>
              </div>
              <p className="mt-1 font-mono text-slate-700">{acc.email}</p>
              <p className="font-mono text-slate-700">{acc.password}</p>
            </li>
          ))}
        </ul>
      </Card>

      {ROLE_ORDER.map((role) => {
        const section = DOC_SECTIONS.find((s) => s.role === role);
        if (!section) return null;
        return (
          <Card key={role}>
            <h2 className="mb-3 font-semibold text-slate-900">{section.heading}</h2>
            <ul className="flex flex-col gap-4">
              {section.items.map((item) => (
                <li key={item.title}>
                  <p className="font-medium text-slate-800">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Genel Ayarlar</h1>
        <p className="text-sm text-slate-500">Platform genelinde geçerli olan temel ayarlar ve sistem bilgilendirmesi.</p>
      </div>
      <SimpleTabs
        defaultKey="ayarlar"
        tabs={[
          { key: "ayarlar", label: "Genel Ayarlar", content: ayarlarTab },
          {
            key: "anasayfa-ayarlari",
            label: "Anasayfa Ayarları",
            content: (
              <HomepageAyarlarForm
                hero={heroSettings ?? { hero_media_type: "image", hero_media_url: null }}
                tiles={tileSettings ?? []}
                initialImages={mediaLibrary.images}
                initialVideos={mediaLibrary.videos}
              />
            ),
          },
          { key: "sistem-bilgisi", label: "Sistem Bilgisi", content: sistemBilgisiTab },
        ]}
      />
    </div>
  );
}
