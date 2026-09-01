import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

// Referans (DJI Agriculture) tasarimindaki gibi: her ozellik gercek bir
// fotografin uzerine bindirilmis, kalin/net iki satirlik bir baslikla
// anlatiliyor - ikon + aciklama kutusu yerine kare fotograf kartlari.
// Gorseller /public/grade-bg altindaki, sitede zaten kullanilan gercek
// ogrenci fotograflari (yapay zeka gorseli degil).
const FEATURE_TILES = [
  {
    image: "/grade-bg/ilkokul-1.jpg",
    title: "1-2 Soruyla Eksik Tespiti",
    desc: "Birkaç soruyla tam olarak nerede takıldığını bulur",
  },
  {
    image: "/grade-bg/ortaokul-1.jpg",
    title: "Kişisel Yıllık Program",
    desc: "Hedefe göre otomatik çalışma takvimi ve haftalık hedefler",
  },
  {
    image: "/grade-bg/lise-1.jpg",
    title: "Yapay Zekâ Destekli Analiz",
    desc: "Yanlışlardaki ortak hata örüntüsünü tespit eder",
  },
  {
    image: "/grade-bg/ortaokul-2.jpg",
    title: "Gerektiğinde Özel Ders",
    desc: "Uzman bir öğretmenle eşleştirilir, online ders randevusu alınır",
  },
  {
    image: "/grade-bg/ilkokul-2.jpg",
    title: "Anlık Veli Bilgilendirmesi",
    desc: "İlerleme raporları ve sınav sonuçları veliye anlık yansır",
  },
  {
    image: "/grade-bg/ilkokul-3.jpg",
    title: "1. Sınıftan 12. Sınıfa Tüm Dersler",
    desc: "Müfredata birebir uygun konu ağacıyla tüm dersler",
  },
];

const EXAM_COURSES = ["LGS", "TYT", "AYT", "YKS", "KPSS", "ALES"];

// site-header.tsx ve middleware.ts'teki ROLE_HOME ile ayni esleme - bkz.
// site-header.tsx'teki not: middleware server-only import'lar icerdigi icin
// dogrudan paylasilamiyor, kucuk bir kopyasi tutuluyor.
const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  moderator: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Yönetici paneli",
  teacher: "Öğretmen paneli",
  moderator: "Öğretmen paneli",
  student: "Öğrenci paneli",
  parent: "Veli paneli",
};

// Hero'daki tek buton icin "git" fiiliyle biten kisa metin - ROLE_LABEL
// ("Öğrenci paneli") ile ayni ama cumle icinde dogal dursun diye.
const ROLE_PANEL_CTA: Record<string, string> = {
  admin: "Yönetici paneline git",
  teacher: "Öğretmen paneline git",
  moderator: "Öğretmen paneline git",
  student: "Öğrenci paneline git",
  parent: "Veli paneline git",
};

// Anasayfa artik server component: oturum durumu SSR sirasinda (cookie
// uzerinden) cozuluyor. Boylece hem SiteHeader'da "once cikis yap/ucretsiz
// basla gorunup sonra panel butonuna donusme" yanip sonme sorunu ortadan
// kalkiyor, hem de zaten giris yapmis bir ziyaretciye anlamsiz "Ogrenci
// olarak basla" / "Zaten hesabim var" butonlari yerine dogrudan kendi
// paneline goturen tek bir buton gosteriliyor.
//
// Tasarim notu: sayfanin tamaminda daha once kullanilan, "yapay zeka ile
// hazirlanmis" izlenimi veren seffaf/soluk arka plan gorseli (sabit
// dijital-kurs.jpg + beyaz gradyan) ve suzulen formul animasyonu tamamen
// kaldirildi. Yerine, kurumsal bir referans tasarimdan (DJI Agriculture)
// esinlenilen koyu lacivert + mavi vurgu renk paleti, kalin/net baslik
// tipografisi ve gercek fotograflarin uzerine bindirilmis kare kartlar
// kullanildi.
export default async function Home() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  let panelHref: string | null = null;
  let panelLabel = "Panelim";
  let panelCta = "Panelime git";

  if (userData.user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
    const role = profile?.role;
    panelHref = role ? ROLE_HOME[role] ?? "/ogrenci" : "/ogrenci";
    panelLabel = role ? ROLE_LABEL[role] ?? "Panelim" : "Panelim";
    panelCta = role ? ROLE_PANEL_CTA[role] ?? "Panelime git" : "Panelime git";
  }

  const isLoggedIn = !!panelHref;

  return (
    <div className="flex flex-1 flex-col bg-white">
      <SiteHeader
        initialIsLoggedIn={isLoggedIn}
        initialPanelHref={panelHref}
        initialPanelLabel={panelLabel}
        showSectionNav
      />

      {/* Hero: koyu, tam genislikte, gercek bir fotografin uzerine
          bindirilmis kalin baslik - kurumsal referans tasarimdaki hero
          bolumune benzer sade/net yapi. */}
      <section className="relative overflow-hidden bg-slate-950">
        <Image
          src="/grade-bg/varsayilan.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-60"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="text-xs font-bold tracking-[0.25em] text-blue-400">TÜRKİYE MÜFREDATINA GÖRE HAZIRLANDI</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold tracking-tight text-white md:text-6xl">
            1. sınıftan YKS&apos;ye, kişiye özel dijital dershanen
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
            Eksiğini tespit eden, çalışma programı çıkaran ve gerektiğinde özel derse yönlendiren yapay zekâ
            destekli sınav hazırlık platformu.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {isLoggedIn ? (
              <Link
                href={panelHref!}
                className="rounded-md bg-blue-600 px-7 py-3.5 text-sm font-bold text-white hover:bg-blue-500"
              >
                {panelCta} →
              </Link>
            ) : (
              <>
                <Link href="/kayit" className="rounded-md bg-blue-600 px-7 py-3.5 text-sm font-bold text-white hover:bg-blue-500">
                  Öğrenci olarak başla
                </Link>
                <Link
                  href="/giris"
                  className="rounded-md border border-slate-500 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10"
                >
                  Zaten hesabım var
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* SEO'ya uygun program tanitimi: sinif araligi, kapsanan sinavlar ve
          calisma yontemi acikca anlatiliyor (yonetici/ogretmen paneli gibi
          ic islevlerden hic bahsedilmiyor - bu bolum tamamen ogrenci/veli
          odakli). */}
      <section id="sinavlar" className="mx-auto max-w-4xl px-6 pt-16 pb-4 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
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
            <span key={c} className="rounded-md border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-700">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Ozellikler: referans tasarimdaki (DJI Agriculture) kare fotograf
          kartlari - her karede gercek bir fotograf ve uzerine bindirilmis
          kalin/net iki satirlik baslik. */}
      <section id="ozellikler" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          Odak ile neler değişir?
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_TILES.map((f) => (
            <div key={f.title} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-900">
              <Image
                src={f.image}
                alt=""
                fill
                className="object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-70"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-slate-950/60" />
              <div className="absolute inset-x-5 top-6 text-center">
                <h3 className="text-lg font-extrabold leading-snug text-white md:text-xl">{f.title}</h3>
              </div>
              <div className="absolute inset-x-5 bottom-5 text-center">
                <p className="text-sm font-medium leading-snug text-slate-200">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Veliler icin: koyu lacivert bir bant - kurumsal sitelerdeki "call to
          action" seritlerine benzer, ust/alt bolumlerden net ayrisiyor. */}
      <section id="veliler" className="bg-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">Veliler de sürecin içinde</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            Veli hesabından çocuğunun genel durumunu, çalışma programını, çözdüğü ve çözmesi gereken soruları, geçmiş
            sınav sonuçlarını ve gerektiğinde özel ders taleplerini tek ekrandan takip edebilir.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Odak — Türkiye eğitim sistemine göre geliştirilmiştir.
      </footer>
    </div>
  );
}
