import { Card } from "@/components/ui";
import { DOC_SECTIONS } from "@/lib/docs/content";

export default function NasilCalisirPage() {
  const section = DOC_SECTIONS.find((s) => s.role === "teacher");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sistem Nasıl Çalışır?</h1>
        <p className="text-sm text-slate-500">
          Soru ekleme, konu anlatımı, öğrenci bilgilendirmesi ve özel ders süreciyle ilgili güncel özet.
        </p>
      </div>

      <Card>
        <ul className="flex flex-col gap-4">
          {section?.items.map((item) => (
            <li key={item.title}>
              <p className="font-medium text-slate-800">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.body}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
