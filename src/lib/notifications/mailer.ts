// Basit e-posta gonderme sarmalayicisi. Su an gercek bir e-posta
// sağlayıcısı (ör. Resend, SendGrid) BAĞLI DEĞİL - bu fonksiyon şimdilik
// sadece sunucu loguna yazıyor, hiçbir yere gerçek e-posta göndermiyor.
//
// Gercek gonderimi eklemek icin: bir saglayici hesabi acip API anahtarini
// ortam degiskeni olarak ekle (ör. RESEND_API_KEY), sonra bu fonksiyonun
// govdesini o saglayicinin API cagrisiyla degistir. Bu dosyayi cagiran
// diger kodlarin (ör. teacher-application.ts) hicbirini degistirmene
// gerek kalmaz.
export async function sendMail(params: { to: string[]; subject: string; text: string }) {
  const { to, subject, text } = params;

  if (!to.length) return;

  // TODO: gercek e-posta saglayicisi baglanınca burasi degisecek.
  console.log("[mailer] E-posta gönderilecekti (henüz bir sağlayıcı bağlı değil):", {
    to,
    subject,
    text,
  });
}
