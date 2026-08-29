import { redirect } from "next/navigation";

// Veli Bağlantıları artık Kullanıcılar sayfasının bir sekmesi - eski
// bağlantılar/yer imleri kırılmasın diye buraya gelenler yönlendiriliyor.
export default function VeliBaglantilariRedirect() {
  redirect("/admin/kullanicilar");
}
