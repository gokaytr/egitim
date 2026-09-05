"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button } from "@/components/ui";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { BulkQuestionImport } from "@/components/bulk-question-import";
import { AiQuestionGenerate } from "@/components/ai-question-generate";
import { QuestionEditForm, type EditableQuestion } from "@/components/question-edit-form";
import { getTestLabel } from "@/lib/questions/test-labels";

export type PanelTopic = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  subject_name: string;
  exam_types: string[] | null;
  target_question_count: number | null;
};

type PanelQuestion = EditableQuestion & {
  is_approved: boolean;
  is_rejected: boolean;
  follows_new_policy: boolean;
  test_number: number | null;
};

type ReviewStatus = "pending" | "approved" | "rejected";

function reviewStatusOf(q: { is_approved: boolean; is_rejected: boolean }): ReviewStatus {
  if (q.is_approved) return "approved";
  if (q.is_rejected) return "rejected";
  return "pending";
}

type RowSel = { type: "grade"; value: number } | { type: "exam"; value: string };

const DEFAULT_TARGET = 60;
const LOAD_LIMIT = 300;
const GRADE_ROWS = Array.from({ length: 12 }, (_, i) => i + 1);
// Anasayfadaki kanonik sinav sirasiyla ayni (bkz. reference-pool-browser.tsx
// EXAM_ORDER) - kullanicinin talebiyle bu satirlar sinif pillerinin SAGINDA,
// ayni satirda sirali gosteriliyor (ör. "12. Sınıf ... KPSS AYT YKS ...").
const EXAM_ROW_ORDER = ["BILSEM", "LGS", "TYT", "AYT", "YDT", "YKS", "DGS", "KPSS", "ALES", "YDS", "YOKDIL"];

// "1. sinifa basinca fizik gorunmesin, her sinifin altinda olan dersler
// gorunsun" talebiyle - Ders secimi artik sistemdeki TUM dersleri degil,
// gercek Turkiye mufredatinda (MEB haftalik ders cizelgeleri, ttkb.meb.gov.tr
// kaynakli) o sinif/sinavda okutulan/sorulan dersleri gosteriyor. Isimler
// subjects tablosundaki gercek ders adlariyla BIREBIR eslesmeli - yeni bir
// ders (subjects tablosuna) eklenirse bu iki liste de guncellenmeli, yoksa
// o ders hicbir sinif/sinavin altinda gorunmez.
//
// GUNCELLEME (2. tur - kullanicinin "9. sinifta tarih cografya fizik kimya
// biyoloji yok, geometri/analitik geometri/felsefe yok" geri bildirimiyle):
// lise (9-12) tarafinda daha once SADECE Matematik+Fizik+Ingilizce+Din
// Kulturu vardi - bu gercek lise mufredatiyla (MEB TTKB resmi ders
// programlari, ozel okul/kolej/dershane kaynaklari) karsilastirilinca acikca
// eksikti. Kimya/Biyoloji/Tarih/Cografya/Felsefe artik ayri birer `subjects`
// satiri (bkz. Supabase) - Fizik gibi bunlar da lisede ayri branslardir,
// Fen Bilimleri/Sosyal Bilgiler (ortaokul dersleri) ile KARISTIRILMAMALI.
// Turkce, lisede "Turk Dili ve Edebiyati" adini alsa da sistemde AYNI
// `subjects` satirini (ayni soru havuzunu) paylasmaya devam ediyor - sadece
// artik 9-12 icin de Ders satirinda gosteriliyor (eskiden lise sinif
// filtresine hic eklenmemisti, bu bir eksiklikti). "Geometri/Analitik
// Geometri" ayri bir `subjects` satiri DEGIL - gercek MEB mufredatinda da
// ayri bir ders degil, Matematik dersinin bir alt konu basligi; bu yuzden
// Matematik altinda konu (topic) olarak eklendi, Ders piline yeni bir satir
// olarak eklenmedi.
//
// Kaynak (MEB resmi haftalik ders cizelgeleri + TTKB ogretim programlari):
// Turkce 1-8. sinif + lisede Turk Dili ve Edebiyati adiyla 9-12 kesintisiz
// (ayni ders/subjects satiri); Matematik 1-12 kesintisiz (geometri/analitik
// geometri bu dersin icinde, ayri ders degil); Hayat Bilgisi 1-3. sinif;
// Fen Bilimleri 3-8. sinif (lisede Fizik/Kimya/Biyoloji'ye ayrilir - bu 3'u
// da 9-12 kesintisiz ayri branslardir); Sosyal Bilgiler 4-7. sinif (8.
// sinifta yerini tamamen T.C. Inkilap Tarihi ve Ataturkculuk'e birakiyor);
// Tarih ve Cografya lisede 9-12 kesintisiz ayri branslardir; Felsefe SADECE
// 10. ve 11. sinifta okutulur (9. ve 12.de yoktur - 12.de yerine
// Psikoloji/Sosyoloji/Mantik gibi secmeli dersler gelir, bunlar sisteme
// eklenmedi cunku sinav bazli soru bankasi acisindan LGS/TYT/AYT/YKS/
// KPSS/ALES/BILSEM'in hicbirinde sorulmuyor); Yabanci Dil (Ingilizce) MEB
// devlet okullarinda resmi olarak 2. siniftan itibaren zorunlu, ancak ozel
// okul/kolejlerin buyuk cogunlugunda 1. siniftan itibaren de okutuluyor -
// kullanicinin acik talebiyle 1. sinifa da eklendi; Din Kulturu ve Ahlak
// Bilgisi 4. siniftan itibaren kesintisiz (anayasal olarak 1-3. sinifta
// yok); T.C. Inkilap Tarihi ve Ataturkculuk SADECE 8. sinif (LGS dersi) ve
// lisede SADECE 11. sinifta okutuluyor.
//
// Bilincli olarak EKLENMEYEN dersler: Gorsel Sanatlar, Muzik, Beden
// Egitimi/Oyun, Bilisim Teknolojileri ve Yazilim, Teknoloji ve Tasarim,
// Rehberlik gibi dersler gercek mufredatta var olsa da bu platform bir
// sinav hazirlik/soru bankasi sistemi - LGS/TYT/AYT/YDT/YKS/KPSS/ALES/
// BILSEM sinavlarinin hicbirinde bu dersler sorulmadigi icin Ders
// secimine eklenmedi (eklense soru hicbir zaman girilmeyecek bos bir
// ders olarak kalirdi).
const GRADE_SUBJECT_NAMES: Record<number, string[]> = {
  1: ["Türkçe", "Matematik", "Hayat Bilgisi", "İngilizce"],
  2: ["Türkçe", "Matematik", "Hayat Bilgisi", "İngilizce"],
  3: ["Türkçe", "Matematik", "Hayat Bilgisi", "İngilizce", "Fen Bilimleri"],
  4: ["Türkçe", "Matematik", "İngilizce", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü ve Ahlak Bilgisi"],
  5: ["Türkçe", "Matematik", "İngilizce", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü ve Ahlak Bilgisi"],
  6: ["Türkçe", "Matematik", "İngilizce", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü ve Ahlak Bilgisi"],
  7: ["Türkçe", "Matematik", "İngilizce", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü ve Ahlak Bilgisi"],
  8: [
    "Türkçe",
    "Matematik",
    "İngilizce",
    "Fen Bilimleri",
    "Din Kültürü ve Ahlak Bilgisi",
    "T.C. İnkılap Tarihi ve Atatürkçülük",
  ],
  9: ["Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "İngilizce", "Din Kültürü ve Ahlak Bilgisi"],
  10: [
    "Türkçe",
    "Matematik",
    "Fizik",
    "Kimya",
    "Biyoloji",
    "Tarih",
    "Coğrafya",
    "Felsefe",
    "İngilizce",
    "Din Kültürü ve Ahlak Bilgisi",
  ],
  11: [
    "Türkçe",
    "Matematik",
    "Fizik",
    "Kimya",
    "Biyoloji",
    "Tarih",
    "Coğrafya",
    "Felsefe",
    "İngilizce",
    "Din Kültürü ve Ahlak Bilgisi",
    "T.C. İnkılap Tarihi ve Atatürkçülük",
  ],
  12: ["Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "İngilizce", "Din Kültürü ve Ahlak Bilgisi"],
};

const EXAM_SUBJECT_NAMES: Record<string, string[]> = {
  // BILSEM sinavi ozellikle ilkokul (2-4. sinif) ogrencilerine uygulaniyor.
  BILSEM: ["Türkçe", "Matematik", "Fen Bilimleri", "Hayat Bilgisi"],
  // LGS (8. sinif merkezi sinavi, OSYM): Turkce, Matematik, Fen Bilimleri,
  // T.C. Inkilap Tarihi ve Ataturkculuk, Din Kulturu, Ingilizce - 6 ders.
  LGS: ["Türkçe", "Matematik", "Fen Bilimleri", "İngilizce", "Din Kültürü ve Ahlak Bilgisi", "T.C. İnkılap Tarihi ve Atatürkçülük"],
  // TYT: Turkce, Matematik, Fen Bilimleri testi (Fizik+Kimya+Biyoloji ayri
  // branslar olarak), Sosyal Bilimler testi (Tarih+Cografya+Felsefe grubu+
  // Din Kulturu). Onceki halde yanlislikla ortaokul dersi "Fen Bilimleri"
  // TYT'ye baglanmisti - bu kaldirildi, yerine gercek lise branslari
  // (Kimya/Biyoloji/Tarih/Cografya/Felsefe) eklendi.
  TYT: ["Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü ve Ahlak Bilgisi"],
  // AYT: sayisal (Matematik, Fizik/Kimya/Biyoloji), esit agirlik/sozel
  // (Turkce/Edebiyat, Tarih/Cografya/Felsefe grubu). Yabanci Dil AYT'nin
  // degil, ayri bir oturum olan YDT'nin (Yabanci Dil Testi) kapsamina
  // alindi - onceki halde yanlislikla AYT'ye eklenmisti.
  AYT: ["Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe"],
  // YDT (Yabanci Dil Testi) - YKS'nin Ingilizce/Almanca/Fransizca gibi ayri
  // bir oturumu, sadece Ingilizce sistemde var.
  YDT: ["İngilizce"],
  // YKS, TYT+AYT+YDT'yi kapsayan sinav markasi - ucunun birlestirilmis ders
  // kumesi.
  YKS: [
    "Türkçe",
    "Matematik",
    "Fizik",
    "Kimya",
    "Biyoloji",
    "Tarih",
    "Coğrafya",
    "Felsefe",
    "Din Kültürü ve Ahlak Bilgisi",
    "İngilizce",
  ],
  // KPSS Genel Yetenek-Genel Kultur (Turkce, Matematik, Tarih, Cografya,
  // T.C. Inkilap Tarihi ve Ataturkculuk, Vatandaslik) + KPSS Alan Bilgisi
  // (A Grubu - belirli universite bolumu mezunlarina yonelik, kullanicinin
  // acik talebiyle eklendi): Hukuk, Iktisat, Maliye, Muhasebe, Isletme,
  // Kamu Yonetimi, Calisma Ekonomisi, Istatistik, Uluslararasi Iliskiler.
  // "Guncel Bilgiler" (Genel Kultur'un bir parcasi) bilincli olarak
  // eklenmedi - surekli degisen guncel olaylara dayandigi icin kalici bir
  // konu/soru bankasi mantigina uymuyor.
  KPSS: [
    "Türkçe",
    "Matematik",
    "Tarih",
    "Coğrafya",
    "T.C. İnkılap Tarihi ve Atatürkçülük",
    "Vatandaşlık",
    "Hukuk",
    "İktisat",
    "Maliye",
    "Muhasebe",
    "İşletme",
    "Kamu Yönetimi",
    "Çalışma Ekonomisi",
    "İstatistik",
    "Uluslararası İlişkiler",
  ],
  // ALES: sozel + sayisal akil yurutme, Turkce/Matematik agirlikli.
  ALES: ["Türkçe", "Matematik"],
  // DGS (Dikey Gecis Sinavi): on lisans mezunlarinin lisansa gecisi icin -
  // TYT duzeyinde Turkce+Matematik agirlikli, ayri bir ders seti yok, bu
  // yuzden ilgili Turkce/Matematik konulari da veride DGS ile etiketlendi.
  DGS: ["Türkçe", "Matematik"],
  // YDS/e-YDS (Yabanci Dil Bilgisi Seviye Tespit Sinavi): e-YDS, YDS'nin
  // aynen ayni mufredatli bilgisayar tabanli surumu oldugu icin ayri bir
  // enum degeri ACILMADI - konular tek "YDS" etiketi altinda birlestirildi.
  YDS: ["İngilizce"],
  // YOKDIL (Yuksekogretim Kurumlari Yabanci Dil Sinavi) - akademik/ileri
  // duzey Ingilizce, YDS ile buyuk olcude ayni mufredati paylasir (bkz.
  // Ingilizce dersindeki YDS/YOKDIL ortak etiketli konular).
  YOKDIL: ["İngilizce"],
};

function allowedSubjectNames(row: RowSel): string[] {
  return row.type === "grade" ? GRADE_SUBJECT_NAMES[row.value] ?? [] : EXAM_SUBJECT_NAMES[row.value] ?? [];
}

function rowMatches(row: RowSel, t: PanelTopic): boolean {
  return row.type === "grade" ? t.grade_level === row.value : (t.exam_types ?? []).includes(row.value);
}

function RowButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-manipulation rounded-full border px-3 py-1 text-xs font-medium transition ${
        active ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

// Kullanicinin defalarca "olmadi, karisik oldu" dedigi sinif/sinav x ders
// matrisi tamamen terk edildi. Bunun yerine TEK bir konu seciliyor: once
// "sinif VEYA sinav" (ayni satirda, sinif pilleri 1-12, saginda sinav
// pilleri LGS/TYT/AYT/YKS/KPSS/ALES/BILSEM), sonra ders, sonra konu. Konu
// secilince o konunun sorulari, ekleme butonu, onay butonu VE (admin ise)
// o konunun bagli oldugu her sinav icin ayri bir paylas satiri ayni yerde
// gorunur.
export function QuestionTopicPanel({
  topics,
  counts,
  subjects,
  subjectIds,
  isAdmin,
  allowAdd = true,
}: {
  topics: PanelTopic[];
  /** Konu basina { total, approved } - bkz. migration 0035: veritabaninda
   * GROUP BY yapan question_counts_by_topic RPC'sinden geliyor, boylece hem
   * "kac soru eklendi" hem de "kaci onaylandi" (konu listesinde "Onaylandı"
   * rozetini gostermek icin) tek seferde okunabiliyor. */
  counts: Map<string, { total: number; approved: number }>;
  /** Ders secimi artik sadece secili sinif/sinavda konusu olan degil, TUM
   * dersleri gosteriyor (kullanicinin "tum siniflarin derslerini soru
   * olmasa da ekle" talebi) - boylece henuz konu/soru girilmemis bir ders
   * de gorunur ve secilebilir kalir. */
  subjects: { id: string; name: string }[];
  subjectIds?: string[];
  isAdmin: boolean;
  /** false verilirse "+ Soru Ekle" butonu/paneli hic gosterilmez, sadece
   * konunun mevcut sorulari (ve onlarin onayla butonlari) gorunur - bu
   * ogretmen panelinde "Genel Bakis" artik sadece GOZ ATMA icin, soru
   * ekleme tek bir yerde (bkz. ogretmen/page.tsx "Soru Ekle / Onay"
   * sekmesi) toplansin diye kullanicinin talebiyle eklendi. */
  allowAdd?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const [row, setRow] = useState<RowSel | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState("");
  const [questions, setQuestions] = useState<PanelQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [imagePromptCopiedId, setImagePromptCopiedId] = useState<string | null>(null);

  const selectedTopic = topicId ? topicById.get(topicId) : undefined;

  // Secili sinif/sinavda henuz konusu/sorusu olmayan bir ders de listede
  // kalsin diye topics'e gore filtrelemiyoruz - ama GRADE_SUBJECT_NAMES/
  // EXAM_SUBJECT_NAMES'e gore o sinif/sinavda gercekten okutulan/sorulan
  // dersler disinda hicbir sey gosterilmiyor (ör. 1. sinifta Fizik yok).
  const subjectsForRow = useMemo(() => {
    if (!row) return [];
    const allowed = new Set(allowedSubjectNames(row));
    return subjects.filter((s) => allowed.has(s.name)).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [row, subjects]);

  // Sinif/sinav ve ders pillerinin yanindaki "onayli/toplam" sayaclari -
  // kullanicinin "hangi ders/sinifta hala is var, hangisi bitti belli
  // olsun" talebiyle eklendi. Ekstra bir veritabani sorgusu YOK: zaten
  // sayfa yuklenirken tek seferde cekilen `topics` ve `counts` (bkz.
  // migration 0035 question_counts_by_topic RPC'si) üzerinden, tarayicida
  // basit bir toplama ile hesaplaniyor - topics birkaç yuz satirlik kucuk
  // bir liste oldugu icin bu islem onemsiz derecede ucuz, sistemi/veritabanini
  // ek bir yuk bindirmiyor.
  const rowCounts = useMemo(() => {
    const map = new Map<string, { total: number; approved: number }>();
    const add = (key: string, c: { total: number; approved: number }) => {
      const prev = map.get(key) ?? { total: 0, approved: 0 };
      map.set(key, { total: prev.total + c.total, approved: prev.approved + c.approved });
    };
    for (const t of topics) {
      const c = counts.get(t.id);
      if (!c) continue;
      if (t.grade_level != null) add(`g-${t.grade_level}`, c);
      for (const e of t.exam_types ?? []) add(`e-${e}`, c);
    }
    return map;
  }, [topics, counts]);

  const subjectCountsForRow = useMemo(() => {
    const map = new Map<string, { total: number; approved: number }>();
    if (!row) return map;
    for (const t of topics) {
      if (!rowMatches(row, t)) continue;
      const c = counts.get(t.id);
      if (!c) continue;
      const prev = map.get(t.subject_id) ?? { total: 0, approved: 0 };
      map.set(t.subject_id, { total: prev.total + c.total, approved: prev.approved + c.approved });
    }
    return map;
  }, [row, topics, counts]);

  function CountSuffix({ c }: { c?: { total: number; approved: number } }) {
    if (!c || c.total === 0) return null;
    return <span className="ml-1 font-normal opacity-70">{c.approved}/{c.total}</span>;
  }

  const topicsForRowSubject = useMemo(() => {
    if (!row || !subjectId) return [];
    return topics.filter((t) => rowMatches(row, t) && t.subject_id === subjectId).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [row, subjectId, topics]);

  // Kullanicinin talebiyle: bir ogretmenin (ya da herhangi bir kullanicinin)
  // secilen sinif/sinavda YALNIZCA tek bir dersi varsa ("bu ogretmenin
  // birden fazla branşı yoksa"), Ders adimini ayrica tiklatmadan o tek ders
  // otomatik secilir - subjectsForRow useMemo'su henuz guncellenmeden
  // (state degisikligi asenkron) hesaplanacagi icin ayni filtreleme burada
  // dogrudan tekrarlaniyor. Birden fazla ders varsa (ör. admin, ya da
  // birden fazla branşı olan bir ogretmen) eskisi gibi kullanici secer.
  function pickRow(next: RowSel) {
    setRow(next);
    setTopicId("");
    setQuestions([]);
    setAddOpen(false);
    const allowed = new Set(allowedSubjectNames(next));
    const matches = subjects.filter((s) => allowed.has(s.name));
    setSubjectId(matches.length === 1 ? matches[0].id : null);
  }

  function pickSubject(id: string) {
    setSubjectId(id);
    setTopicId("");
    setQuestions([]);
    setAddOpen(false);
  }

  // pickTopic'ten ayri bir fonksiyon olarak cikarildi: konu secildiginde
  // (diger UI durumlarini - addOpen/editingId - sifirlayarak) VE yeni bir
  // soru eklendiginde (mevcut UI durumunu bozmadan, sadece listeyi
  // tazeleyerek) ayni sorgu tekrar kullanilabilsin diye. Boylece "+ Soru
  // Ekle" panelinden bir soru eklenince liste otomatik yenilenir ve yeni
  // soru (onay bekliyorsa Onayla butonuyla birlikte) hemen gorunur.
  async function loadQuestions(id: string) {
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select(
        "id, body, options, correct_option, explanation, difficulty, is_approved, is_rejected, follows_new_policy, test_number, image_url"
      )
      .eq("topic_id", id)
      .eq("is_reference_only", false)
      .order("test_number", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(LOAD_LIMIT);
    setQuestions(
      ((data ?? []) as Record<string, unknown>[]).map((q) => ({
        id: q.id as string,
        body: q.body as string,
        options: (q.options ?? {}) as Record<string, string>,
        correct_option: q.correct_option as string,
        explanation: (q.explanation as string) ?? null,
        difficulty: q.difficulty as EditableQuestion["difficulty"],
        is_approved: !!q.is_approved,
        is_rejected: !!q.is_rejected,
        follows_new_policy: !!q.follows_new_policy,
        test_number: (q.test_number as number) ?? null,
        image_url: (q.image_url as string) ?? null,
      }))
    );
    setLoading(false);
  }

  async function pickTopic(id: string) {
    setTopicId(id);
    setAddOpen(false);
    setEditingId(null);
    await loadQuestions(id);
  }

  // Tek bir sorunun onay durumunu degistirir: "onayla" -> is_approved=true,
  // "reddet" -> is_rejected=true, ikisi de birbirini otomatik temizler (bir
  // soru ayni anda hem onayli hem reddedilmis olamaz). Zaten onayli/reddedilmis
  // olan bir soruya tekrar tiklanirsa (buyuk durum butonu) "onay bekliyor"
  // durumuna geri doner - boylece yanlislikla onaylanan/reddedilen bir soru
  // kolayca geri alinabilir.
  async function setQuestionStatus(id: string, next: ReviewStatus) {
    setReviewingId(id);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    const now = new Date().toISOString();
    const patch =
      next === "approved"
        ? { is_approved: true, is_rejected: false, approved_by: userId, approved_at: now, rejected_by: null, rejected_at: null }
        : next === "rejected"
          ? { is_approved: false, is_rejected: true, rejected_by: userId, rejected_at: now }
          : { is_approved: false, is_rejected: false, approved_by: null, approved_at: null, rejected_by: null, rejected_at: null };
    await supabase.from("questions").update(patch).eq("id", id);
    setReviewingId(null);
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, is_approved: next === "approved", is_rejected: next === "rejected" } : q))
    );
  }

  // Konudaki onay bekleyen (ve daha once reddedilmis) TUM sorulari tek
  // seferde onaylar - kullanicinin "chatgpt'ye sorup dogru dedikten sonra
  // toplu onaylayabilelim" talebiyle eklendi.
  async function approveAllInTopic() {
    if (!selectedTopic) return;
    const reviewCount = questions.filter((q) => reviewStatusOf(q) !== "approved").length;
    if (reviewCount === 0) return;
    if (!window.confirm(`${selectedTopic.name} konusundaki onaylanmamış ${reviewCount} soru toplu olarak onaylansın mı?`)) {
      return;
    }
    setBulkApproving(true);
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from("questions")
      .update({
        is_approved: true,
        is_rejected: false,
        approved_by: userData.user?.id ?? null,
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
      })
      .eq("topic_id", selectedTopic.id)
      .eq("is_reference_only", false)
      .eq("is_approved", false);
    await loadQuestions(selectedTopic.id);
    setBulkApproving(false);
  }

  // Konudaki tum sorulari, bir yapay zeka sohbetine yapistirilip kalite
  // kontrolu icin sorulabilecek duz metin haline getirip panoya kopyalar.
  async function copyTopicQuestions() {
    if (!selectedTopic) return;
    const header = `Konu: ${selectedTopic.name} (${selectedTopic.subject_name})\n\n`;
    const body = questions
      .map((q, i) => {
        const opts = Object.entries(q.options ?? {})
          .map(([key, val]) => `${key}) ${val}${key === q.correct_option ? "  <-- doğru cevap" : ""}`)
          .join("\n");
        return `${i + 1}. ${q.body}\n${opts}\nAçıklama: ${q.explanation ?? "(açıklama yok)"}`;
      })
      .join("\n\n");
    const prompt =
      "\n\n---\nYukarıdaki soruları ve cevap anahtarını kontrol et. Sadece yanlış, hatalı veya belirsiz olan soruları listele; her biri için hangi soru olduğunu ve sorunun sebebini kısaca belirt. Doğru olan sorular hakkında yorum yapmana veya onları tek tek listelemene gerek yok.";
    try {
      await navigator.clipboard.writeText(header + body + prompt);
      setCopyStatus("Kopyalandı ✓");
    } catch {
      setCopyStatus("Kopyalanamadı, tarayıcı izni gerekebilir.");
    }
    setTimeout(() => setCopyStatus(null), 2500);
  }

  // Bu soruya gorsel hazirlamak icin Gemini/ChatGPT gibi bir gorsel uretme
  // araciyla kullanilabilecek bir istem (prompt) metni olusturup panoya
  // kopyalar - kullanicinin "gorseli ben eklemeyecegim, yapay zekaya
  // sorulacak metni kopyalayip Gemini gibi bir yerde hazirlayip admin
  // panelinden ekleyelim" talebiyle eklendi (bkz. yukaridaki "Gorsel
  // URL'i" alani - uretilen gorselin linki oraya yapistiriliyor). Gercek
  // gorsel uretimi burada YAPILMIYOR, sadece istem metni kopyalaniyor.
  async function copyImagePrompt(q: PanelQuestion) {
    const optionsText = Object.entries(q.options ?? {})
      .map(([key, val]) => `${key}) ${val}`)
      .join("\n");
    const prompt = [
      "Aşağıdaki soru için, çocuklara yönelik (ilkokul/ortaokul seviyesi), sade ve anlaşılır, sorunun içeriğini görsel olarak destekleyen bir eğitim illüstrasyonu üret. Metin/yazı içermesin, sadece görsel olsun.",
      "",
      `Soru: ${q.body}`,
      optionsText ? `Şıklar:\n${optionsText}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(prompt);
      setImagePromptCopiedId(q.id);
      setTimeout(() => setImagePromptCopiedId((cur) => (cur === q.id ? null : cur)), 2500);
    } catch {
      setImagePromptCopiedId(null);
    }
  }

  if (topics.length === 0) {
    return <p className="text-sm text-slate-500">Henüz hiç konu (müfredat) eklenmemiş.</p>;
  }

  const added = selectedTopic ? counts.get(selectedTopic.id)?.total ?? 0 : 0;
  const approvedCount = selectedTopic ? counts.get(selectedTopic.id)?.approved ?? 0 : 0;
  const target = selectedTopic ? selectedTopic.target_question_count ?? DEFAULT_TARGET : 0;
  const topicFullyApproved = added > 0 && approvedCount === added;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Sınıf / Sınav</p>
        <div className="flex w-full max-w-full flex-wrap gap-1.5 overflow-x-hidden">
          {GRADE_ROWS.map((g) => (
            <RowButton key={`g-${g}`} active={!!row && row.type === "grade" && row.value === g} onClick={() => pickRow({ type: "grade", value: g })}>
              {g}. Sınıf
              <CountSuffix c={rowCounts.get(`g-${g}`)} />
            </RowButton>
          ))}
          {EXAM_ROW_ORDER.map((e) => (
            <RowButton key={`e-${e}`} active={!!row && row.type === "exam" && row.value === e} onClick={() => pickRow({ type: "exam", value: e })}>
              {e}
              <CountSuffix c={rowCounts.get(`e-${e}`)} />
            </RowButton>
          ))}
        </div>
      </div>

      {row && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Ders</p>
          {subjectsForRow.length === 0 ? (
            <p className="text-xs text-slate-500">
              {/* Ogretmen icin: bu sinif/sinavda ders yoksa nedeni cogunlukla
                  ders eksikligi degil, o ogretmenin branşinin bu sinif/sinavda
                  okutulmamasi/sorulmamasi (ör. Matematik ogretmeni YOKDIL'e
                  tiklarsa). Kullanicinin talebiyle bu durumda genel "henuz
                  konu yok" yerine branşa ozel bir mesaj gosteriliyor - admin
                  ise (tum dersleri gordugu icin) genel mesaji gormeye devam
                  ediyor. */}
              {!isAdmin ? "Bu sınıf veya sınavda senin branşına ait ders yok." : "Bu seçimde henüz konu yok."}
            </p>
          ) : (
            <div className="flex w-full max-w-full flex-wrap gap-1.5 overflow-x-hidden">
              {subjectsForRow.map((s) => (
                <RowButton key={s.id} active={subjectId === s.id} onClick={() => pickSubject(s.id)}>
                  {s.name}
                  <CountSuffix c={subjectCountsForRow.get(s.id)} />
                </RowButton>
              ))}
            </div>
          )}
        </div>
      )}

      {row && subjectId && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Konu</p>
          {topicsForRowSubject.length === 0 ? (
            <p className="text-xs text-slate-500">Bu sınıf/ders için henüz konu yok.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {topicsForRowSubject.map((t) => {
                const topicCount = counts.get(t.id);
                const topicAdded = topicCount?.total ?? 0;
                const topicApproved = topicCount?.approved ?? 0;
                const topicTarget = t.target_question_count ?? DEFAULT_TARGET;
                const topicFullyApproved = topicAdded > 0 && topicApproved === topicAdded;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTopic(t.id)}
                    className={`touch-manipulation flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      topicId === t.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{t.name}</span>
                    <span className="flex items-center gap-1.5">
                      {/* Konu tekrar acilip kontrol edilmeden de "tamamen
                          onaylandi mi" belli olsun diye - kullanicinin
                          "tekrar bakmayalım" talebiyle eklendi. */}
                      {topicFullyApproved && <Badge tone="green">✓ Onaylandı</Badge>}
                      <Badge tone={topicAdded >= topicTarget ? "green" : topicAdded > 0 ? "amber" : "default"}>
                        {topicAdded}/{topicTarget} soru
                      </Badge>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedTopic && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-800">{selectedTopic.name}</p>
              {questions.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={bulkApproving || questions.every((q) => reviewStatusOf(q) === "approved")}
                    onClick={approveAllInTopic}
                    className="touch-manipulation rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkApproving ? "Onaylanıyor…" : "Tümünü Onayla"}
                  </button>
                  <button
                    type="button"
                    onClick={copyTopicQuestions}
                    className="touch-manipulation rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Kopyala (AI kontrolü için)
                  </button>
                  {copyStatus && <span className="text-xs text-slate-500">{copyStatus}</span>}
                </>
              )}
              {topicFullyApproved && <Badge tone="green">✓ Onaylandı</Badge>}
              <Badge tone={added >= target ? "green" : added > 0 ? "amber" : "default"}>
                {added}/{target} soru
              </Badge>
            </div>
            {allowAdd && (
              <Button variant="secondary" onClick={() => setAddOpen((v) => !v)}>
                {addOpen ? "Kapat" : "+ Soru Ekle"}
              </Button>
            )}
          </div>

          {allowAdd && addOpen && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ManualQuestionForm
                  topicId={selectedTopic.id}
                  autoApprove={isAdmin}
                  onAdded={() => loadQuestions(selectedTopic.id)}
                />
                <BulkQuestionImport
                  topicId={selectedTopic.id}
                  subjectIds={subjectIds}
                  autoApprove={isAdmin}
                  onAdded={() => loadQuestions(selectedTopic.id)}
                />
              </div>
              {isAdmin && (
                <div className="mt-6 max-w-xl border-t border-slate-200 pt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge tone="amber">Test aşamasında</Badge>
                    <p className="text-sm text-slate-500">Yapay zeka ile soru üret, ara sıra hata verebilir.</p>
                  </div>
                  <AiQuestionGenerate topicId={selectedTopic.id} onStatus={setStatus} />
                  {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-slate-400">Yükleniyor…</p>
          ) : questions.length === 0 ? (
            <p className="text-xs text-slate-400">Bu konuda henüz soru yok.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {questions.map((q, i) => {
                const reviewStatus = reviewStatusOf(q);
                const busy = reviewingId === q.id;
                // test_number'a gore konu birden fazla test grubuna
                // ayrilmissa (bkz. migration 0033), her grubun basina iki
                // dilli (TR/EN) bir baslik ekleniyor - kullanicinin
                // "ogrenci/ogretmen/veli/admin hepsi test isimlerini gorsun"
                // talebiyle, ogrenci tarafindaki ayni etiketler (bkz.
                // src/lib/questions/test-labels.ts) burada da kullaniliyor.
                const prevTestNumber = i > 0 ? questions[i - 1].test_number : undefined;
                const showTestHeader = q.test_number != null && q.test_number !== prevTestNumber;
                return (
                  <li key={q.id} className="contents">
                    {showTestHeader && (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-indigo-500 first:mt-0">
                        {getTestLabel(q.test_number as number)}
                      </p>
                    )}
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {i + 1}. {q.body}
                      </p>
                      <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                        {Object.entries(q.options ?? {}).map(([key, val]) => {
                          const isCorrect = key === q.correct_option;
                          return (
                            <li
                              key={key}
                              className={`rounded-lg border px-2.5 py-1.5 ${
                                isCorrect
                                  ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-800"
                                  : "border-slate-200 text-slate-600"
                              }`}
                            >
                              {key}) {val}
                              {isCorrect && " ✓"}
                            </li>
                          );
                        })}
                      </ul>
                      {q.explanation && (
                        <div className="mt-2 rounded-lg bg-indigo-50 p-2.5 text-xs text-indigo-900">
                          <p className="mb-1 font-semibold uppercase tracking-wide text-indigo-500">Açıklama</p>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                      {q.image_url && (
                        <p className="mt-2 text-xs text-slate-500">
                          🖼️{" "}
                          <a href={q.image_url} target="_blank" rel="noreferrer" className="underline">
                            Görseli görüntüle
                          </a>
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingId(editingId === q.id ? null : q.id)}
                          className="touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
                        >
                          {editingId === q.id ? "Kapat" : "Düzenle"}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyImagePrompt(q)}
                          className="touch-manipulation text-xs font-medium text-slate-600 hover:underline"
                        >
                          {imagePromptCopiedId === q.id ? "Kopyalandı ✓" : "Görsel için AI istemi kopyala"}
                        </button>
                      </div>
                      {editingId === q.id && (
                        <div className="mt-2">
                          <QuestionEditForm question={q} onDone={() => setEditingId(null)} />
                        </div>
                      )}
                    </div>

                    {/* Buyuk durum butonu: onay bekliyorsa yan yana
                        Onayla/Reddet, aksi halde tek bir "Onaylandı"/
                        "Reddedildi" butonu - tekrar tiklamak onay
                        bekliyor durumuna geri dondurur. */}
                    <div className="flex w-32 shrink-0 flex-col gap-1.5 sm:w-36">
                      {reviewStatus === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setQuestionStatus(q.id, "approved")}
                            className="touch-manipulation rounded-lg bg-emerald-600 px-2 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busy ? "…" : "✓ Onayla"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setQuestionStatus(q.id, "rejected")}
                            className="touch-manipulation rounded-lg bg-red-600 px-2 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            {busy ? "…" : "✕ Reddet"}
                          </button>
                        </>
                      )}
                      {reviewStatus === "approved" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setQuestionStatus(q.id, "pending")}
                          title="Onayı kaldırıp 'onay bekliyor' durumuna döndürmek için tıkla"
                          className="touch-manipulation rounded-lg border-2 border-emerald-600 bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {busy ? "…" : "✓ Onaylandı"}
                        </button>
                      )}
                      {reviewStatus === "rejected" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setQuestionStatus(q.id, "pending")}
                          title="Reddi kaldırıp 'onay bekliyor' durumuna döndürmek için tıkla"
                          className="touch-manipulation rounded-lg border-2 border-red-600 bg-red-50 px-2 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {busy ? "…" : "✕ Reddedildi"}
                        </button>
                      )}
                    </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
