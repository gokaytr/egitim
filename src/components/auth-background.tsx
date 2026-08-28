import Image from "next/image";
import Link from "next/link";

// Giris/Kayit sayfalarinda anasayfadaki gorsel temayla tutarlilik icin ayni
// gorsel kullaniliyor, ama form odakli bir ekran oldugu icin cok daha
// seffaf/soluk (anasayfadan daha dusuk opasiteli).
export function AuthPageBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <Image src="/dijital-kurs.jpg" alt="" fill priority className="object-cover opacity-20" sizes="100vw" />
      <div className="absolute inset-0 bg-white/75" />
    </div>
  );
}

export function AuthPageHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-16">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
        <span className="text-lg font-semibold text-slate-900">Odak</span>
      </Link>
      <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
        ← Anasayfaya dön
      </Link>
    </header>
  );
}
