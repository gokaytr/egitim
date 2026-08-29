// Sinif seviyesine gore gorsel/metin varyanti secen saf yardimci fonksiyon.
// "use client" etiketi TASIMAZ - hem sunucu bilesenlerinden (ör. öğrenci
// genel bakis sayfasi) hem istemci bilesenlerinden (GradeBackground,
// RoleShell) güvenle çağrılabilmesi için ayrı bir dosyada tutuluyor.
// Not: bunu "use client" içeren bir dosyadan (grade-background.tsx gibi)
// bir sunucu bileşenine aktarmak, Next.js'te derleme zamaninda degil
// çalışma zamanında "cannot call a client function from the server"
// hatasına yol açar - bu yüzden bu dosya kasıtlı olarak istemci
// etiketinden bağımsız tutuluyor.

export type GradeBackgroundVariant = "ilkokul" | "ortaokul" | "lise" | "default";

export function gradeBackgroundVariant(gradeLevel: number | null | undefined): GradeBackgroundVariant {
  if (gradeLevel == null) return "default";
  if (gradeLevel <= 4) return "ilkokul";
  if (gradeLevel <= 8) return "ortaokul";
  return "lise";
}
