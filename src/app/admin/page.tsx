import { redirect } from "next/navigation";

// "Planlama" ekrani (sinav/sinif/ders/konu bazinda hedef-ilerleme takvimi)
// kullanicinin acik talebiyle ("adminde planlamayi kaldir") tamamen
// kaldirildi. /admin adresine giden eski linkler/yer imleri kirilmasin diye
// bu route hala var ama dogrudan /admin/sorular'a yonlendiriyor - admin
// panelinin yeni ilk giris ekrani orasi (bkz. admin/layout.tsx NAV).
export default function AdminRootPage() {
  redirect("/admin/sorular");
}
