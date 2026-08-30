import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { NewUserForm } from "./new-user-form";
import { RoleSelect } from "./role-select";
import { TeacherStudentManager } from "@/components/teacher-student-manager";
import { ParentLinkForm } from "@/components/parent-link-form";
import { DeleteParentLinkButton } from "@/components/delete-parent-link-button";
import { AdminUsersTabs } from "@/components/admin-users-tabs";
import { ROLE_LABEL, ROLE_TONE } from "@/lib/admin/role-labels";

export default async function KullanicilarPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, grade_level, exam_target, created_at, is_demo")
    .order("created_at", { ascending: false });

  // Test kullanicilar (is_demo=true) artik "Kullanicilar" sekmesinde hicbir
  // zaman gorunmuyor - show_demo_data ayarindan bagimsiz olarak kendi
  // sekmelerinde ("Test Kullanicilar" / "Test Veliler") listeleniyor.
  const allUsers = users ?? [];
  const visibleUsers = allUsers.filter((u) => !u.is_demo);
  const testStudents = allUsers.filter((u) => u.role === "student" && u.is_demo);
  const testParents = allUsers.filter((u) => u.role === "parent" && u.is_demo);

  const teachers = visibleUsers.filter((u) => u.role === "teacher");
  const students = visibleUsers.filter((u) => u.role === "student");
  const parents = visibleUsers.filter((u) => u.role === "parent");

  const [{ data: teacherStudentAssignments }, { data: parentLinks }] = await Promise.all([
    supabase.from("teacher_students").select("teacher_id, student_id"),
    supabase
      .from("parent_student_links")
      .select(
        "parent_id, student_id, parent:profiles!parent_student_links_parent_id_fkey(full_name), student:profiles!parent_student_links_student_id_fkey(full_name)"
      )
      .order("created_at", { ascending: false }),
  ]);

  const linkedStudentIdByParentId = new Map<string, string>();
  for (const l of parentLinks ?? []) {
    if (!linkedStudentIdByParentId.has(l.parent_id)) {
      linkedStudentIdByParentId.set(l.parent_id, l.student_id);
    }
  }

  const usersTab = (
    <div className="flex flex-col gap-6">
      <NewUserForm />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Ad Soyad</th>
              <th className="px-5 py-3 font-medium">E-posta</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Rolü Değiştir</th>
              <th className="px-5 py-3 font-medium">Sınıf / Hedef</th>
              <th className="px-5 py-3 font-medium">Kayıt Tarihi</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-900">
                  <Link href={`/admin/kullanicilar/${u.id}`} className="hover:text-indigo-600 hover:underline">
                    {u.full_name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-slate-600">{u.email}</td>
                <td className="px-5 py-3">
                  <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                </td>
                <td className="px-5 py-3">
                  <RoleSelect userId={u.id} currentRole={u.role} />
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {u.grade_level ? `${u.grade_level}. sınıf` : "-"} {u.exam_target ? `· ${u.exam_target}` : ""}
                </td>
                <td className="px-5 py-3 text-slate-400">{new Date(u.created_at).toLocaleDateString("tr-TR")}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/admin/kullanicilar/${u.id}`} className="font-medium text-indigo-600 underline">
                    Profil →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleUsers.length && <p className="p-5 text-sm text-slate-500">Henüz kullanıcı yok.</p>}
      </Card>
    </div>
  );

  const veliTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">Hangi velinin hangi öğrenciyi görebileceğini buradan yönet. Veliler kendi ekranlarından da öğrenci ekleyebilir.</p>
      <ParentLinkForm parents={parents} students={students} />
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
            {parentLinks
              ?.filter((l) => !testParents.some((tp) => tp.id === l.parent_id))
              .map((l) => {
                const parent = Array.isArray(l.parent) ? l.parent[0] : l.parent;
                const student = Array.isArray(l.student) ? l.student[0] : l.student;
                return (
                  <tr key={`${l.parent_id}-${l.student_id}`} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 text-slate-900">{parent?.full_name}</td>
                    <td className="px-5 py-3 text-slate-900">{student?.full_name}</td>
                    <td className="px-5 py-3 text-right">
                      <DeleteParentLinkButton parentId={l.parent_id} studentId={l.student_id} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!parentLinks?.length && <p className="p-5 text-sm text-slate-500">Henüz veli-öğrenci bağlantısı yok.</p>}
      </Card>
    </div>
  );

  const ogretmenOgrenciTab = (
    <TeacherStudentManager
      teachers={teachers.map((t) => ({ id: t.id, full_name: t.full_name }))}
      students={students.map((s) => ({ id: s.id, full_name: s.full_name }))}
      assignments={teacherStudentAssignments ?? []}
    />
  );

  const testKullanicilarTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        1. sınıftan 12. sınıfa kadar her sınıf düzeyi için birer test öğrenci hesabı. Görüntüle bağlantısına
        tıklayarak o test öğrencinin gerçek ekranını görebilirsin.
      </p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Ad Soyad</th>
              <th className="px-5 py-3 font-medium">Sınıf</th>
              <th className="px-5 py-3 font-medium">E-posta</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {testStudents
              .sort((a, b) => (a.grade_level ?? 0) - (b.grade_level ?? 0))
              .map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-900">{u.full_name}</td>
                  <td className="px-5 py-3 text-slate-600">{u.grade_level ? `${u.grade_level}. sınıf` : "-"}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/kullanicilar/${u.id}`} className="font-medium text-indigo-600 underline">
                        Profil →
                      </Link>
                      <Link href={`/ogrenci?studentId=${u.id}`} className="font-medium text-indigo-600 underline">
                        Görüntüle →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!testStudents.length && <p className="p-5 text-sm text-slate-500">Henüz test öğrenci yok.</p>}
      </Card>
    </div>
  );

  const testVelilerTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">Her test öğrenciye bağlı birer test veli hesabı.</p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Ad Soyad</th>
              <th className="px-5 py-3 font-medium">E-posta</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {testParents.map((u) => {
              const linkedStudentId = linkedStudentIdByParentId.get(u.id);
              return (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-900">{u.full_name}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/kullanicilar/${u.id}`} className="font-medium text-indigo-600 underline">
                        Profil →
                      </Link>
                      {linkedStudentId && (
                        <Link href={`/ogrenci/rapor?studentId=${linkedStudentId}`} className="font-medium text-indigo-600 underline">
                          Öğrencisini Görüntüle →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!testParents.length && <p className="p-5 text-sm text-slate-500">Henüz test veli yok.</p>}
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Kullanıcılar</h1>
        <p className="text-sm text-slate-500">Tüm admin, öğretmen, öğrenci ve veli hesapları</p>
      </div>

      <AdminUsersTabs
        usersTab={usersTab}
        veliTab={veliTab}
        ogretmenOgrenciTab={ogretmenOgrenciTab}
        testKullanicilarTab={testKullanicilarTab}
        testVelilerTab={testVelilerTab}
      />
    </div>
  );
}
