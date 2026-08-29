import Image from "next/image";
import Link from "next/link";
import { EducationBackground } from "@/components/education-background";
import { SiteHeader } from "@/components/site-header";

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
    desc: "Öğrenci tek başına aşamadığı konularda alanında uzman bir öğretmenle eşleştirilir ve online ders randevusu oluşturulur.",
  },
  {
    title: "Veli bilgilendirmesi",
    desc: "İlerleme raporları, çözülen/çözülmesi gereken sorular ve geçmiş sınav sonuçları veliye anlık olarak yansır.",
  },
  {
    title: "1. sınıftan 12. sınıfa tüm dersler",
    desc: "Matematik, Türkçe, Fen Bilimleri, Fizik, İngilizce ve daha fazlası - müfredata birebir uygun konu ağacıyla.",
  },
];

const EXAM_COURSES = ["LGS", "TYT", "AYT", "YKS", "KPSS", "ALES"];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Sayfa boyunca sabit kalan (scroll ile kaybolmayan), soluk ve
          canlandirici arka plan gorseli - metin okunurlugu icin uzerine
          beyaz agirlikli bir gradyan bindirilmis. */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Image
          src="/dijital-kurs.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-white/60" />
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100/25 via-transparent to-sky-100/25" />
      </div>

      <SiteHeader />

      <section className="relative overflow-hidden">
        <EducationBackground />
        <div className="relative mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            1. sınıftan YKS&apos;ye, kişiye özel dijital dershanen
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Türkiye müfredatına göre eksiğini tespit eden, çalışma programı çıkaran ve gerektiğinde
            özel derse yönlendiren yapay zeka destekli sınav hazırlık platformu.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/kayit" className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
              Öğrenci olarak başla
            </Link>
            <Link href="/giris" className="rounded-lg border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Zaten hesabım var
            </Link>
          </div>
        </div>
      </section>

      {/* SEO'ya uygun program tanitimi: sinif araligi, kapsanan sinavlar ve
          calisma yontemi acikca anlatiliyor (yonetici/ogretmen paneli gibi
          ic islevlerden hic bahsedilmiyor - bu bolum tamamen ogrenci/veli
          odakli). */}
      <section className="relative mx-auto max-w-4xl px-6 pb-4 text-center">
        <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
          LGS, TYT, AYT, YKS, KPSS ve ALES hazırlığı tek platformda
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
          Odak, ilkokul 1. sınıftan üniversite sınavlarına ve kamu personeli sınavlarına kadar geniş bir yaş
          aralığında kişiselleştirilmiş sınav hazırlığı sunar. Öğrenci önce kısa bir seviye tespiti yapar; sistem
          hangi konularda eksik olduğunu, hangi soruları çözmesi gerektiğini ve ne kadar süre çalışması gerektiğini
          otomatik olarak belirler. Matematik, Türkçe, Fen Bilimleri, Fizik, İngilizce ve daha birçok dersten
          binlerce soru, konu anlatımı ve deneme sınavıyla düzenli çalışma alışkanlığı kazandırır.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {EXAM_COURSES.map((c) => (
            <span key={c} className="rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-sm font-semibold text-indigo-700">
              {c}
            </span>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid max-w-5xl grid-cols-1 gap-5 px-6 py-16 sm:grid-cols-2 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="relative mx-auto max-w-4xl px-6 pb-16 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Veliler de sürecin içinde</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Veli hesabından çocuğunun genel durumunu, çalışma programını, çözdüğü ve çözmesi gereken soruları, geçmiş
          sınav sonuçlarını ve gerektiğinde özel ders taleplerini tek ekrandan takip edebilir.
        </p>
      </section>

      <footer className="relative border-t border-slate-200/70 bg-white/70 px-6 py-6 text-center text-xs text-slate-400 backdrop-blur">
        © {new Date().getFullYear()} Odak — Türkiye eğitim sistemine göre geliştirilmiştir.
      </footer>
    </div>
  );
}