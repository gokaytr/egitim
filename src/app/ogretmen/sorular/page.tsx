import { redirect } from "next/navigation";

// Kullanicinin "ogretmen panelinde de ilk acilis admin paneli gibi olsun"
// talebiyle bu sayfanin tum icerigi /ogretmen'e (Genel Bakis sekmesine)
// tasindi - eski baglantilar/yer imleri kirilmasin diye buraya gelenler
// yonlendiriliyor.
export default function OgretmenSorularRedirect() {
  redirect("/ogretmen");
}
