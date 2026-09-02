import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PDF/Word/metin dosyalarindan (JPEG/taranmis gorseller HARIC - onlar icin
// OCR ya da ucretli AI gerekir, bu proje simdilik sadece metin destekliyor)
// duz metin cikaran, disari hicbir API/AI cagirmayan (ucretsiz) route.
// Cikan metin, ayni "Soru:/A)/B).../Cevap:" formatinda ayristiriciya
// (bulk-parser.ts) veya (Soru Havuzu'nda) yapay zeka destekli ham metin
// ayristiricisina (reference-pool-ai-import.tsx) veriliyor.
export const runtime = "nodejs";

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// ÖSYM tarzi sinav kagitlari genelde İKİ SÜTUN halinde dizilir - eski
// pdf-parse ("okuma sirasina" degil, PDF icindeki ham metin sirasina gore
// cikarir) bu durumda iki sutunu satir satir ic ice bindirip "s ırası yla"
// gibi anlamsiz kirik kelimeler uretiyordu. pdf.js-extract her kelimenin
// sayfadaki (x, y) konumunu verdigi icin, satirlari once sol/sag sutuna
// ayirip sonra HER SUTUNU KENDI ICINDE yukaridan asagiya birlestirerek
// doğru okuma sirasini yeniden kuruyoruz - kullanicinin bildirdigi "kötü
// ekleme" sorununun kok nedeni buydu.
// pdf.js-extract, ayni kelimeyi bile bazen birden fazla ayri "item"a
// bolebiliyor (ozellikle Turkce'ye ozgu ı/ş/ğ/ö/ü/ç harflerinde font/glif
// gecisleri nedeniyle) - onceki kod HER item arasina kosulsuz bosluk
// koyuyordu, bu da "sırasıyla" gibi tek bir kelimeyi "s ırası yla" seklinde
// parcaliyordu (kullanicinin bildirdigi asil sorun buydu). Dogru cozum,
// gercek bir bosluk olup olmadigina items arasindaki YATAY BOSLUGA (x
// koordinati farkina) bakarak karar vermek: iki item birbirine bitisikse
// (aralarinda anlamli bir bosluk yoksa) dogrudan birlestir, gercekten
// ayrikse aralarina bosluk koy - tipki bir PDF okuyucunun goz ile yaptigi
// gibi.
type PdfLineItem = { str: string; x: number; width: number };
function joinLineItems(items: PdfLineItem[]): string {
  let text = "";
  let prevEndX: number | null = null;
  let prevAvgCharWidth = 0;
  for (const item of items) {
    const str = item.str;
    if (!str) continue;
    if (prevEndX !== null) {
      const gap = item.x - prevEndX;
      // Esik: onceki kelimenin ortalama karakter genisliginin bir kismi -
      // gercek kelime araligi genelde bir karakter genisligine yakindir,
      // kelime ICI harf araligi (kerning) ise cok daha kucuktur.
      const threshold = Math.max(prevAvgCharWidth * 0.35, 1);
      if (gap > threshold) {
        text += " ";
      }
    }
    text += str;
    prevEndX = item.x + item.width;
    prevAvgCharWidth = str.length > 0 ? item.width / str.length : prevAvgCharWidth;
  }
  return text.replace(/\s+/g, " ").trim();
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const { PDFExtract } = await import("pdf.js-extract");
  const pdfExtract = new PDFExtract();
  const data = await pdfExtract.extractBuffer(buffer, {});

  const pageTexts = data.pages.map((page) => {
    const lines = PDFExtract.utils.pageToLines(page, 3);
    if (!lines.length) return "";

    const pageWidth = page.info.width || Math.max(...page.content.map((c) => c.x + c.width), 1);
    const columnBoundary = pageWidth / 2;

    type Line = { y: number; text: string; isLeftColumn: boolean };
    const builtLines: Line[] = lines.map((line) => {
      const sorted = [...line].sort((a, b) => a.x - b.x);
      const text = joinLineItems(sorted);
      const avgX = sorted.reduce((sum, item) => sum + item.x, 0) / sorted.length;
      const y = Math.min(...sorted.map((item) => item.y));
      return { y, text, isLeftColumn: avgX < columnBoundary };
    });

    const leftColumn = builtLines.filter((l) => l.isLeftColumn).sort((a, b) => a.y - b.y);
    const rightColumn = builtLines.filter((l) => !l.isLeftColumn).sort((a, b) => a.y - b.y);

    return [...leftColumn, ...rightColumn]
      .map((l) => l.text)
      .filter(Boolean)
      .join("\n");
  });

  return pageTexts.join("\n\n");
}

// Sutun tabanli yeniden siralama beklenmedik bicimde bozuk/eksik metin
// uretirse (ör. tek sutunlu, standart olmayan bir PDF), eski basit
// (sirali, sutun ayirmayan) pdf-parse cikarimina geri dusuyoruz - hicbir
// zaman kullaniciyi bos elle birakmayalim.
async function extractFromPdfFallback(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (!profile || !["admin", "teacher", "moderator"].includes(profile.role)) {
    return NextResponse.json({ error: "Bu işlem için yetkin yok" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    let text: string;
    if (name.endsWith(".docx")) {
      text = await extractFromDocx(buffer);
    } else if (name.endsWith(".pdf")) {
      try {
        text = await extractFromPdf(buffer);
        if (!text.trim()) throw new Error("sütun tabanlı çıkarım boş sonuç verdi");
      } catch (columnErr) {
        console.warn("extract-text: sütun tabanlı PDF çıkarımı başarısız, basit çıkarıma dönülüyor", columnErr);
        text = await extractFromPdfFallback(buffer);
      }
    } else if (name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        {
          error:
            "Desteklenmeyen dosya türü. Şimdilik .docx, .pdf ve .txt destekleniyor (JPEG/taranmış görseller için metin okuma henüz yok).",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ text });
  } catch (err) {
    console.error("extract-text hatası", err);
    return NextResponse.json({ error: "Dosyadan metin çıkarılamadı. Dosya bozuk ya da şifreli olabilir." }, { status: 500 });
  }
}
