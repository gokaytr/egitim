import { NextResponse } from "next/server";
import { notifyAdminOfTeacherApplication } from "@/lib/notifications/teacher-application";

// Kayit ekraninda "Öğretmenim" secilip basvuru tamamlandiginda cagirilir.
// Sadece bildirim denemesi yapar, kayit akisini asla engellemez - bu yuzden
// her zaman basarili doner (bildirim basarisiz olsa bile).
export async function POST(req: Request) {
  const { fullName, email } = await req.json().catch(() => ({}));
  if (typeof fullName === "string" && typeof email === "string" && fullName && email) {
    await notifyAdminOfTeacherApplication({ fullName, email });
  }
  return NextResponse.json({ ok: true });
}
