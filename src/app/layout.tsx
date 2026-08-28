import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Odak | LGS, TYT, AYT, YKS, KPSS, ALES Sınav Hazırlık Platformu",
  description:
    "1. sınıftan 12. sınıfa, LGS'den YKS'ye, KPSS ve ALES'e kadar kişiselleştirilmiş sınav hazırlık platformu. Yapay zeka destekli eksik tespiti, otomatik çalışma programı ve özel ders desteğiyle.",
  keywords: [
    "LGS hazırlık",
    "TYT hazırlık",
    "AYT hazırlık",
    "YKS hazırlık",
    "KPSS hazırlık",
    "ALES hazırlık",
    "online sınav hazırlık",
    "kişiselleştirilmiş çalışma programı",
    "dijital dershane",
  ],
  openGraph: {
    title: "Odak | Sınav Hazırlık Platformu",
    description: "1. sınıftan 12. sınıfa, LGS'den YKS'ye kişiselleştirilmiş sınav hazırlık ve koçluk platformu.",
    images: ["/dijital-kurs.jpg"],
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
