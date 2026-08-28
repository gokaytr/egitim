import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { DOC_SECTIONS } from "@/lib/docs/content";

export default async function OgrenciNasilCalisirPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sistem Nasıl Çalışır?</h1>
        <p className="text-sm text-slate-500">Platformu nasıl kullanacağına dair güncel özet.</p>
      </div>

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
}
