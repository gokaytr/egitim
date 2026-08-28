import { QuestionAddScreen } from "@/components/question-add-screen";

export default function SoruEklePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soru Ekle</h1>
        <p className="text-sm text-slate-500">
          Elle soru ekleyin veya kopyala-yapıştır ile ya da PDF/Word dosyası yükleyerek toplu soru içe aktarın.
        </p>
      </div>
      <QuestionAddScreen />
    </div>
  );
}
