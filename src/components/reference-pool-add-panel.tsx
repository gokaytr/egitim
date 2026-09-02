"use client";

import { useState } from "react";
import { TopicPickerTabs } from "@/components/topic-picker-tabs";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { BulkQuestionImport } from "@/components/bulk-question-import";

// Sadece admin panelindeki "Soru Havuzu" sekmesinde kullanilir - buradan
// eklenen her soru dogrudan is_reference_only=true olarak kaydedilir, yani
// normal Soru Ekle/Onayla akisina hic girmez ve ogrenciye hicbir zaman
// gosterilmez. Amac: yapay zekanin ornek alip egitilmesi icin (orn. ÖSYM
// gecmis sinav sorulari) kaliteli bir kaynak biriktirmek. Buraya cogunlukla
// TOPLU (bir sinavin tum sorulari birden) yukleme yapilacagi icin toplu
// ice aktarma 1. sirada, elle tek tek soru ekleme 2. sirada, alt alta
// (yan yana degil) gosteriliyor.
export function ReferencePoolAddPanel() {
  const [topicId, setTopicId] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
        <TopicPickerTabs value={topicId} onChange={setTopicId} />
      </div>
      <BulkQuestionImport topicId={topicId} isReferenceOnly />
      <ManualQuestionForm topicId={topicId} isReferenceOnly />
    </div>
  );
}
