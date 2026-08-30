// Kullanicilar sayfasi ve kisi profil ekrani arasinda paylasilan rol
// etiketleri/renkleri - iki yerde ayri ayri tanimlanmasin diye buraya alindi.
export const ROLE_LABEL: Record<string, string> = {
  admin: "Yönetici",
  teacher: "Öğretmen",
  moderator: "Moderatör",
  student: "Öğrenci",
  parent: "Veli",
};

export const ROLE_TONE: Record<string, "default" | "green" | "amber" | "red"> = {
  admin: "red",
  teacher: "amber",
  moderator: "amber",
  student: "green",
  parent: "default",
};
