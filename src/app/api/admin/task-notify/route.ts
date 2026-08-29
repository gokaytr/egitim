import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdminOfTaskChange } from "@/lib/notifications/admin-task";

// Yapilacak eklendiginde/durumu guncellendiginde cagirilir. Sadece bildirim
// denemesi yapar, ekrandaki islemi asla engellemez.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { action, title, description, status } = body ?? {};

  if (action !== "created" && action !== "status_updated") {
    return NextResponse.json({ error: "Geçersiz aksiyon." }, { status: 400 });
  }
  if (typeof title !== "string" || !title) {
    return NextResponse.json({ error: "title gerekli." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  let actorName: string | null = null;
  if (userData.user) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userData.user.id).single();
    actorName = profile?.full_name ?? null;
  }

  await notifyAdminOfTaskChange({ action, title, description, status, actorName });
  return NextResponse.json({ ok: true });
}
