import { Card, Badge } from "@/components/ui";
import { DOC_SECTIONS, DEMO_ACCOUNTS } from "@/lib/docs/content";

const ROLE_ORDER: Array<"admin" | "teacher" | "parent" | "student"> = ["admin", "teacher", "parent", "student"];

export default function SistemBilgisiPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sistem Bilgilendirme</h1>
        <p className="text-sm text-slate-500">
          Platformun admin, öğretmen, veli ve öğrenci ekranlarında nasıl işlediğinin güncel özeti. Yeni bir
          özellik eklendikçe bu sayfa da güncellenir.
        </p>
      </div>

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
}
