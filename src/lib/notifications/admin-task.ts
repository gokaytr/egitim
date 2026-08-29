import { sendMail } from "@/lib/notifications/mailer";
import { getAdminNotificationEmails } from "@/lib/notifications/admin-recipients";

const STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  in_progress: "Devam Ediyor",
  done: "Tamamlandı",
};

/**
 * "Yapılacaklar" (admin_tasks) tablosunda yeni bir kayit eklendiginde ya da
 * durumu guncellendiginde adminlere bildirim e-postasi gondermeyi dener.
 * E-posta gonderimi henuz gercek bir saglayiciya bagli degil (bkz.
 * mailer.ts) - bu yuzden bu fonksiyon asla hata firlatmaz.
 */
export async function notifyAdminOfTaskChange(params: {
  action: "created" | "status_updated";
  title: string;
  description?: string | null;
  status?: string;
  actorName?: string | null;
}) {
  try {
    const adminEmails = await getAdminNotificationEmails();
    if (!adminEmails.length) return;

    const statusLabel = params.status ? STATUS_LABEL[params.status] ?? params.status : null;
    const subject =
      params.action === "created" ? `Odak - Yeni yapılacak eklendi: ${params.title}` : `Odak - Yapılacak güncellendi: ${params.title}`;
    const lines = [
      params.action === "created" ? "Yeni bir yapılacak eklendi." : "Bir yapılacağın durumu güncellendi.",
      `Başlık: ${params.title}`,
      params.description ? `Açıklama: ${params.description}` : null,
      statusLabel ? `Durum: ${statusLabel}` : null,
      params.actorName ? `İşlemi yapan: ${params.actorName}` : null,
    ].filter(Boolean);

    await sendMail({ to: adminEmails, subject, text: lines.join("\n") });
  } catch (err) {
    console.error("notifyAdminOfTaskChange: bildirim gönderilemedi", err);
  }
}
