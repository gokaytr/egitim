import { redirect } from "next/navigation";

// Soru Ekle, Soru Onayi ve Sorular ile birlikte tek bir "Sorular" sayfasinda
// (sekmeli) birlestirildi - eski baglantilar/yer imleri kirilmasin diye
// buraya gelenler yonlendiriliyor.
export default function SoruEkleRedirect() {
  redirect("/admin/sorular");
}
