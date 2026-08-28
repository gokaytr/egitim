import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { LinkForm } from "./link-form";
import { DeleteLinkButton } from "./delete-link-button";

export default async function VeliBaglantilariPage() {
  const supabase = await createClient();

  const [{ data: parents }, { data: students }, { data: links }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "parent").order("full_name"),
    supabase.from("profiles").select("id, full_name, email").eq("role", "student").order("full_name"),
    supabase
      .from("parent_student_links")
      .select(
        "parent_id, student_id, parent:profiles!parent_student_links_parent_id_fkey(full_name), student:profiles!parent_student_links_student_id_fkey(full_name)"
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Veli Bağlantıları</h1>
        <p className="text-sm text-slate-500">Hangi velinin hangi öğrenciyi görebileceğini buradan yönet. Veliler kendi ekranlarından da öğrenci ekleyebilir.</p>
      </div>

      <LinkForm parents={parents ?? []} students={students ?? []} />

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Veli</th>
              <th className="px-5 py-3 font-medium">Öğrenci</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {links?.map((l) => {
              const parent = Array.isArray(l.parent) ? l.parent[0] : l.parent;
              const student = Array.isArray(l.student) ? l.student[0] : l.student;
              return (
                <tr key={`${l.parent_id}-${l.student_id}`} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 text-slate-900">{parent?.full_name}</td>
                  <td className="px-5 py-3 text-slate-900">{student?.full_name}</td>
                  <td className="px-5 py-3 text-right">
                    <DeleteLinkButton parentId={l.parent_id} studentId={l.student_id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!links?.length && <p className="p-5 text-sm text-slate-500">Henüz veli-öğrenci bağlantısı yok.</p>}
      </Card>
    </div>
  );
}
