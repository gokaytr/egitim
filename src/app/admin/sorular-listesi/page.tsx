import { redirect } from "next/navigation";

// Sorular, Soru Ekle ve Soru Onayi ile birlikte tek bir "Sorular" sayfasinda
// (sekmeli) birlestirildi - eski baglantilar/yer imleri kirilmasin diye
// buraya gelenler yonlendiriliyor.
export default function SorularListesiRedirect() {
  redirect("/admin/sorular");
}
