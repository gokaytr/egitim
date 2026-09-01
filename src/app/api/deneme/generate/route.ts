import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { assembleDeneme, type DenemeMode } from "@/lib/deneme/assemble";
import type { LevelLabel } from "@/lib/deneme/level";

const VALID_MODES: DenemeMode[] = ["seviye_tespit", "rastgele", "onerilen"];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode as DenemeMode;
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: "Geçersiz deneme türü." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("grade_level, exam_target, level_label")
      .eq("id", userData.user.id)
      .single();

    if (profile?.grade_level == null || !profile?.exam_target) {
      return NextResponse.json(
        { error: "Deneme oluşturabilmen için önce Genel Ayarlar'dan sınıf ve hedef sınav bilgini tamamlaman gerekiyor." },
        { status: 422 }
      );
    }

    if (mode === "onerilen" && !profile?.level_label) {
      return NextResponse.json(
        { error: "Şu an seviyenizi tam bilmediğimden size uygun bir deneme gösteremiyorum. Önce Seviye Tespit Sınavı'nı çözelim mi?" },
        { status: 409 }
      );
    }

    // exams/exam_questions tablolarina yazma yetkisi sadece admin/ogretmen/
    // moderator icin acik (RLS) - ogrenci tetiklese de bu montaj islemini
    // sunucu tarafinda service-role client ile yapiyoruz.
    const admin = createAdminClient();
    const result = await assembleDeneme(admin, {
      studentId: userData.user.id,
      gradeLevel: profile?.grade_level ?? null,
      examTarget: profile?.exam_target ?? null,
      mode,
      levelLabel: (profile?.level_label as LevelLabel | null) ?? null,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/deneme/generate beklenmeyen hata", err);
    return NextResponse.json({ error: "Deneme oluşturulurken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
