import { redirect } from "next/navigation";

// Soru Onayi, Soru Ekle ile birlikte tek bir "Sorular" sayfasinda (sekmeli)
// birlestirildi - eski baglantilar/yer imleri kirilmasin diye buraya
// gelenler yonlendiriliyor.
export default function SoruOnayRedirect() {
  redirect("/ogretmen");
}
