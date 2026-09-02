import { TfIdf } from "natural";

// Yapay zekadan BAGIMSIZ (API anahtari gerektirmeyen), tamamen yerel calisan
// konu siniflandirici. Kullanicinin "sınıfa/konuya aktar butonu ile de
// tasnifini sistem kendi içinde yapay zekadan bağımsız yapabilmeli" talebi
// icin - once pgvector+Voyage AI (embedding) tabanli bir cozum onerildi,
// kullanici "yeni API anahtari istemeden daha basit bir alternatif" secti.
// Bu yuzden burada klasik bir bilgi-getirimi teknigi olan TF-IDF kullanilir:
// her aday konu (adi + varsa kazanim metni) bir "dokuman", siniflandirilacak
// soru govdesi ise "sorgu" olarak ele alinir; TfIdf.tfidfs() sorgudaki her
// terimin dokumanlardaki agirligini toplayarak bir alaka skoru uretir - en
// yuksek skorlu konu en olasi eslesme olur. Hicbir dis servise cagri yapmaz.
export type ClassifierCandidateTopic = {
  id: string;
  name: string;
  kazanim?: string | null;
  grade_level?: number | null;
  subject_name?: string | null;
};

export type ClassifierMatch = {
  topic_id: string;
  label: string;
  score: number;
};

export type ClassifyResult = {
  best: ClassifierMatch | null;
  ranked: ClassifierMatch[];
};

// Turkce'ye ozgu asciifikasyon - "Işık" ve "isik" gibi durumlarin ayni terim
// sayilmasi icin. natural'in varsayilan tokenizer'i Turkce ozel karakterleri
// (ı, ş, ğ, ü, ö, ç) kelime sinirinda dogru ele almiyor, bu yuzden once
// asagi harfe cevirip Turkce karakterleri ASCII karsiliklarina indirgiyoruz.
function normalizeTurkish(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topicDocument(topic: ClassifierCandidateTopic): string {
  return normalizeTurkish([topic.name, topic.kazanim ?? ""].filter(Boolean).join(" "));
}

function topicLabel(topic: ClassifierCandidateTopic): string {
  const parts = [topic.subject_name, topic.grade_level ? `${topic.grade_level}. sınıf` : null, topic.name].filter(
    Boolean
  );
  return parts.join(" — ");
}

// questionBody: siniflandirilacak soru metni. candidateTopics: sistemdeki
// tum konular (genelde bir dersin tum konulari, ya da kullanicinin verdigi
// bir alt kume). Donen "ranked" listesi skora gore azalan siralidir; "best"
// en yuksek skorlu konudur (skor 0 ise, yani hicbir ortak terim yoksa, null
// donulur - rastgele bir konu atamak yerine "eslesme yok" demek daha dogru).
export function classifyQuestionTopic(
  questionBody: string,
  candidateTopics: ClassifierCandidateTopic[]
): ClassifyResult {
  if (!questionBody.trim() || candidateTopics.length === 0) {
    return { best: null, ranked: [] };
  }

  const tfidf = new TfIdf();
  for (const topic of candidateTopics) {
    tfidf.addDocument(topicDocument(topic));
  }

  const query = normalizeTurkish(questionBody);
  const scores = tfidf.tfidfs(query);

  const ranked: ClassifierMatch[] = candidateTopics
    .map((topic, i) => ({
      topic_id: topic.id,
      label: topicLabel(topic),
      score: scores[i] ?? 0,
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  return { best: ranked[0] ?? null, ranked: ranked.slice(0, 5) };
}
