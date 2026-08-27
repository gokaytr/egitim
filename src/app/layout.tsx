import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Odak | Sınav Hazırlık Platformu",
  description: "1. sınıftan 12. sınıfa, LGS'den YKS'ye kişiselleştirilmiş sınav hazırlık ve koçluk platformu",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
