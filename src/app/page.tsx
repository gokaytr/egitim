import Link from "next/link";

const FEATURES = [
  {
    title: "1-2 soruyla eksik tespiti",
    desc: "Öğrenci bir konuda kendini nasıl hissettiğini söyler, sistem birkaç soruyla tam olarak nerede takıldığını bulur.",
  },
  {
    title: "Kişisel yıllık program",
    desc: "Hedef sınava (LGS, TYT, AYT, YKS, KPSS, ALES) göre otomatik çalışma takvimi ve haftalık hedefler.",
  },
  {
    title: "Yapay zeka destekli analiz",
    desc: "Yanlışlardaki ortak hata örüntüsünü (işlem hatası, kavram yanılgısı, dikkatsizlik) tespit eder.",
  },
  {
    title: "Gerekirse özel derse yönlendirme",
    desc: "Öğrenci tek başına aşamadığı konularda öğretmenle eşleştirilir ve randevu oluşturulur.",
  },
  {
    title: "Veli bilgilendirmesi",
    desc: "İlerleme raporları ve hatırlatmalar veliye otomatik olarak iletilir.",
  },
  {
    title: "Öğretmen paneli",
    desc: "Öğretmenler konu anlatımı ve soru ekleyip, yapay zekanın ürettiği soruları onaylar.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-5 backdrop-blur md:px-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
          <span className="text-lg font-semibold">Odak</span>
        </div>
        <div className="flex gap-3">
          <Link href="/giris" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Giriş yap
          </Link>
          <Link href="/kayit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Ücretsiz başla
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          1. sınıftan YKS&apos;ye, kişiye özel dijital dershanen
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Türkiye müfredatına göre eksiğini tespit eden, çalışma programı çıkaran ve gerektiğinde
          özel derse yönlendiren yapay zeka destekli sınav hazırlık platformu.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/kayit" className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
            Öğrenci olarak başla
          </Link>
          <Link href="/giris" className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Zaten hesabım var
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-6 pb-24 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 px-6 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Odak — Türkiye eğitim sistemine göre geliştirilmiştir.
      </footer>
    </div>
  );
}
