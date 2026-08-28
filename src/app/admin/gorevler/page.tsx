import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { AdminTaskCreateForm } from "@/components/admin-task-create-form";
import { AdminTaskStatusSelect } from "@/components/admin-task-status-select";
import { AdminTaskAttachmentUpload } from "@/components/admin-task-attachment-upload";

const STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  in_progress: "Devam Ediyor",
  done: "Tamamlandı",
};

const STATUS_TONE: Record<string, "default" | "green" | "amber" | "red"> = {
  pending: "amber",
  in_progress: "default",
  done: "green",
};

// Beklemede/devam eden isler ustte, tamamlananlar en altta gorunsun.
const STATUS_ORDER: Record<string, number> = { pending: 0, in_progress: 1, done: 2 };

export default async function AdminGorevlerPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: attachments }] = await Promise.all([
    supabase.from("admin_tasks").select("id, title, description, status, created_at").order("created_at", { ascending: false }),
    supabase.from("admin_task_attachments").select("id, task_id, file_name, storage_path, uploaded_at"),
  ]);

  const attachmentsByTask = new Map<string, typeof attachments>();
  for (const a of attachments ?? []) {
    const list = attachmentsByTask.get(a.task_id) ?? [];
    list.push(a);
    attachmentsByTask.set(a.task_id, list);
  }

  // Ekli dosyalar private bucket'ta - indirme linki icin imzali url uretiyoruz.
  const signedUrlEntries = await Promise.all(
    (attachments ?? []).map(async (a) => {
      const { data } = await supabase.storage.from("admin-task-files").createSignedUrl(a.storage_path, 60 * 60);
      return [a.id, data?.signedUrl ?? null] as const;
    })
  );
  const signedUrls = new Map(signedUrlEntries);

  const sortedTasks = [...(tasks ?? [])].sort((a, b) => {
    const orderDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Yapılacaklar</h1>
        <p className="text-sm text-slate-500">
          Yönetim ekibinin iş takibi — süreç halinde ilerleyen görevler, durumları ve ilgili PDF/Word dosyaları.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Yeni Yapılacak Ekle</h2>
        <AdminTaskCreateForm />
      </Card>

      {!sortedTasks.length && (
        <Card>
          <p className="text-sm text-slate-500">Henüz bir yapılacak eklenmedi.</p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {sortedTasks.map((t) => {
          const taskAttachments = attachmentsByTask.get(t.id) ?? [];
          return (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{t.title}</h3>
                    <Badge tone={STATUS_TONE[t.status] ?? "default"}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
                  </div>
                  {t.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{t.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString("tr-TR")}</p>
                </div>
                <AdminTaskStatusSelect taskId={t.id} status={t.status} />
              </div>

              {taskAttachments.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                  {taskAttachments.map((a) => {
                    const url = signedUrls.get(a.id);
                    return (
                      <li key={a.id} className="text-sm">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 underline">
                            📎 {a.file_name}
                          </a>
                        ) : (
                          <span className="text-slate-500">📎 {a.file_name}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3">
                <AdminTaskAttachmentUpload taskId={t.id} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
