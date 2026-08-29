import { redirect } from "next/navigation";

// Öğretmen Aktivitesi artık Öğretmenler sayfasının bir sekmesi - eski
// bağlantılar/yer imleri kırılmasın diye buraya gelenler yönlendiriliyor.
export default function OgretmenAktiviteRedirect() {
  redirect("/admin/ogretmen-basvurulari");
}
