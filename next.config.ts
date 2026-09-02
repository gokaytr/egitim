import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI soru uretim rotasi (src/app/api/ai/generate-questions), repo
  // kokundeki question-generation.md/question-quality.md dosyalarini
  // calisma zamaninda fs.readFileSync ile okuyor (bkz.
  // src/lib/ai/anthropic.ts -> loadQuestionPolicyDocs). Vercel'in serverless
  // fonksiyon paketleyicisi (output file tracing) sadece import/require
  // edilen dosyalari otomatik algiladigi icin, dogrudan fs ile okunan bu iki
  // .md dosyasini acikca belirtmezsek production'da "dosya bulunamadi"
  // hatasi alinir (yerel `next dev`/`next build && next start` bunu
  // gostermez, cunku tum repo diskte hazir durur - sorun sadece Vercel'in
  // izole fonksiyon paketinde ortaya cikar).
  outputFileTracingIncludes: {
    "/api/ai/generate-questions": ["./question-generation.md", "./question-quality.md"],
  },
};

export default nextConfig;
