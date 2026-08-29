import { createAdminClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/notifications/mailer";

/**
 * Yeni bir öğretmen başvurusu geldiğinde tüm adminlere bildirim e-postası
 * göndermeyi dener. E-posta gönderimi henüz gerçek bir sağlayıcıya bağlı
 * değil (bkz. mailer.ts) - bu yüzden bu fonksiyon asla hata fırlatmaz,
 * başarısız olursa sessizce loglar. Kayıt akışını bu yüzden hiçbir zaman
 * engellemez.
 *
 * Admin panelindeki "Öğretmen Başvuruları" sekmesindeki yeşil ışık zaten
 * bekleyen başvuruları veritabanından anlık gösteriyor - bu fonksiyon ona
 * ek olarak bir e-posta bildirimi dener.
 */
export async function notifyAdminOfTeacherApplication(applicant: { fullName: string; email: string }) {
  try {
    const admin = createAdminClient();
    const { data: admins } = await admin.from("profiles").select("email").eq("role", "admin");
    const adminEmails = (admins ?? []).map((a) => a.email).filter((e): e is string => !!e);

    if (!adminEmails.length) return;

    await sendMail({
      to: adminEmails,
      subject: "Odak - Yeni öğretmen başvurusu",
      text: `${applicant.fullName} (${applicant.email}) öğretmen olarak kayıt oldu ve onayını bekliyor. Admin panelindeki "Öğretmen Başvuruları" sekmesinden onaylayabilirsin.`,
    });
  } catch (err) {
    console.error("notifyAdminOfTeacherApplication: bildirim gönderilemedi", err);
  }
}
