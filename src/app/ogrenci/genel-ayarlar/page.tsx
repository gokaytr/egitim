import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { SimpleTabs } from "@/components/simple-tabs";
import { DOC_SECTIONS } from "@/lib/docs/content";
import { QuizSettingsForm } from "@/components/quiz-settings-form";
import { getStudentQuizSettings } from "@/lib/student/quiz-settings";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";

export default async function OgrenciGenelAyarlarPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user?.id).single();

  // Bu sayfa hem ogrenci hem veli tarafindan ayni /ogrenci layout'u
  // uzerinden goruntuleniyor; role gore ilgili bolumu (veya admin
  // onizlerken ikisini birden) gosteriyoruz.
  const role = profile?.role;
  const sections = DOC_SECTIONS.filter((s) =>
    role === "parent" ? s.role === "parent" : role === "admin" ? s.role === "student" || s.role === "parent" : s.role === "student"
  );

  // Sinav Ayarlari sekmesi gercek ogrenci hesabinda kendi ayarlarini,
  // admin onizlemesinde ise onizlenen test ogrencinin ayarlarini gosterir -
  // boylece admin, ogrenci panelindeki bu sekmeyi de guncel olarak gorur.
  const { studentId: effectiveStudentId, isAdminPreview } = await resolveEffectiveStudent();
  const canShowQuizSettings = role === "student" || (role === "admin" && isAdminPreview);
  const quizSettings = canShowQuizSettings ? await getStudentQuizSettings(effectiveStudentId) : null;

  const sistemBilgisiTab = (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <Card key={section.role}>
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
      ))}
    </div>
  );

  const sinavAyarlariTab = quizSettings && (
    <QuizSettingsForm initial={quizSettings} studentId={role === "admin" ? effectiveStudentId : undefined} />
  );

  // Sinav Ayarlari varsa ilk acilista o gorunsun, Sistem Bilgisi saga
  // (ikinci sekme olarak) alinsin.
  const tabs = sinavAyarlariTab
    ? [
        { key: "sinav-ayarlari", label: "Sınav Ayarları", content: sinavAyarlariTab },
        { key: "sistem-bilgisi", label: "Sistem Bilgisi", content: sistemBilgisiTab },
      ]
    : [{ key: "sistem-bilgisi", label: "Sistem Bilgisi", content: sistemBilgisiTab }];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Genel Ayarlar</h1>
        <p className="text-sm text-slate-500">Platformu nasıl kullanacağına dair güncel özet.</p>
      </div>
      <SimpleTabs defaultKey={tabs[0].key} tabs={tabs} />
    </div>
  );
}
