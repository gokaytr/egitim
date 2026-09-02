"use client";

import { useState } from "react";
import { TopicPickerTabs } from "@/components/topic-picker-tabs";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { BulkQuestionImport } from "@/components/bulk-question-import";
import { ReferencePoolAiImport } from "@/components/reference-pool-ai-import";

// Sadece admin panelindeki "Soru Havuzu" sekmesinde kullanilir - buradan
// eklenen her soru dogrudan is_reference_only=true olarak kaydedilir, yani
// normal Soru Ekle/Onayla akisina hic girmez ve ogrenciye hicbir zaman
// gosterilmez. Amac: yapay zekanin ornek alip egitilmesi icin (orn. ÖSYM
// gecmis sinav sorulari) kaliteli bir kaynak biriktirmek. Buraya cogunlukla
// TOPLU (bir sinavin tum sorulari birden, gercek PDF metninden kopyalanmis
// bozuk formatli) yukleme yapilacagi icin sira: 1) yapay zeka destekli ham
// metin ayristirma (asil cozum - sabit format gerektirmez, konuyu otomatik
// bulur), 2) duz formatli toplu ice aktarma (zaten "Soru:"/"A)" formatinda
// temiz metin icin), 3) elle tek tek soru ekleme.
export function ReferencePoolAddPanel() {
  const [topicId, setTopicId] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <ReferencePoolAiImport />

      <div className="border-t border-slate-200 pt-6">
        <p className="mb-3 text-sm font-medium text-slate-500">
          Metin zaten &quot;Soru:&quot;/&quot;A)&quot;/&quot;Cevap:&quot; formatındaysa, yapay zekaya gerek kalmadan
          doğrudan aşağıdan da ekleyebilirsin:
        </p>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
          <TopicPickerTabs value={topicId} onChange={setTopicId} />
        </div>
        <BulkQuestionImport topicId={topicId} isReferenceOnly />
        <div className="mt-6">
          <ManualQuestionForm topicId={topicId} isReferenceOnly />
        </div>
      </div>
    </div>
  );
}
