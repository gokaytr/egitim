import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PDF/Word/metin dosyalarindan (JPEG/taranmis gorseller HARIC - onlar icin
// OCR ya da ucretli AI gerekir, bu proje simdilik sadece metin destekliyor)
// duz metin cikaran, disari hicbir API/AI cagirmayan (ucretsiz) route.
// Cikan metin, ayni "Soru:/A)/B).../Cevap:" formatinda ayristiriciya
// (bulk-parser.ts) veriliyor.
export const runtime = "nodejs";

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
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
      text = await extractFromPdf(buffer);
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
