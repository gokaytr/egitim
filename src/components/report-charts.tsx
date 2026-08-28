import type { ReactNode } from "react";
import { firstOf, type ReportData } from "@/lib/reports/report-data";

// Ogrenci raporunun grafik/gorsellestirme blogu. Disaridan kutuphane
// eklemeden (recharts vb.) saf SVG ile cizilen, sunucu bileseni olarak
// calisan (useState/interaktivite gerektirmeyen) hafif grafikler:
//  - AccuracyTrendChart: zaman icinde basari yuzdesi (cizgi grafik)
//  - AnswerBreakdownDonut: toplam dogru/yanlis/bos dagilimi (halka grafik)
//  - WeaknessBarChart: eksik analizlerinin seviye dagilimi (cubuk grafik)
//  - PlanStatusDonut: calisma programi maddelerinin durum dagilimi (halka grafik)
// Hepsi ReportData'dan turetildigi icin veli/ogretmen/admin ekranlarinin
// hepsinde ayni sekilde calisir (StudentReportView uzerinden ortak).

const TONE_HEX: Record<string, string> = {
  green: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  indigo: "#4f46e5",
  slate: "#94a3b8",
};

function accuracyTone(pct: number): string {
  if (pct >= 75) return TONE_HEX.green;
  if (pct >= 50) return TONE_HEX.amber;
  return TONE_HEX.red;
}

function ChartEmpty({ label }: { label: string }) {
  return <p className="flex h-full min-h-[140px] items-center justify-center text-sm text-slate-400">{label}</p>;
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

// ---- Cizgi grafik: son denemelerde basari yuzdesi ----
function AccuracyTrendChart({ attempts }: { attempts: ReportData["attempts"] }) {
  const points = [...attempts]
    .filter((a) => (a.correct_count ?? 0) + (a.wrong_count ?? 0) > 0)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    .slice(-12)
    .map((a) => {
      const answered = (a.correct_count ?? 0) + (a.wrong_count ?? 0);
      const pct = Math.round(((a.correct_count ?? 0) / answered) * 100);
      const topic = firstOf(a.topics);
      return { pct, date: new Date(a.started_at), topicName: topic?.name ?? "Genel" };
    });

  if (points.length === 0) return <ChartEmpty label="Henüz grafik için yeterli test verisi yok." />;

  const W = 560;
  const H = 190;
  const padX = 28;
  const padY = 18;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padX + i * stepX,
    y: padY + innerH - (p.pct / 100) * innerH,
    ...p,
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const avg = Math.round(points.reduce((s, p) => s + p.pct, 0) / points.length);

  return (
    <ChartCard title={`Başarı Trendi (son ${points.length} test) · Ortalama %${avg}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Zaman icinde basari yuzdesi">
        {[0, 25, 50, 75, 100].map((g) => {
          const y = padY + innerH - (g / 100) * innerH;
          return (
            <g key={g}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={2} y={y + 3} fontSize={9} fill="#94a3b8">{g}</text>
            </g>
          );
        })}
        <path d={linePath} fill="none" stroke={TONE_HEX.indigo} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={4} fill={accuracyTone(c.pct)} stroke="white" strokeWidth={1.5} />
            <title>{`${c.topicName} — %${c.pct} (${c.date.toLocaleDateString("tr-TR")})`}</title>
          </g>
        ))}
      </svg>
    </ChartCard>
  );
}

// ---- Halka grafik: genel dogru/yanlis/bos dagilimi ----
function Donut({
  segments,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <ChartEmpty label="Henüz veri yok." />;

  const R = 60;
  const CIRC = 2 * Math.PI * R;
  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 160 160" className="h-36 w-36 shrink-0" role="img" aria-label="Dagilim grafigi">
        <g transform="rotate(-90 80 80)">
          <circle cx={80} cy={80} r={R} fill="none" stroke="#e2e8f0" strokeWidth={18} />
          {segments.map((seg, i) => {
            const frac = seg.value / total;
            const dash = frac * CIRC;
            const circle = (
              <circle
                key={i}
                cx={80}
                cy={80}
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={18}
                strokeDasharray={`${dash} ${CIRC - dash}`}
                strokeDashoffset={-offsetAcc}
              />
            );
            offsetAcc += dash;
            return circle;
          })}
        </g>
        <text x={80} y={76} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0f172a">{total}</text>
        <text x={80} y={94} textAnchor="middle" fontSize={10} fill="#64748b">{centerLabel}</text>
      </svg>
      <ul className="flex flex-col gap-1.5 text-sm">
        {segments.map((seg, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-slate-600">{seg.label}</span>
            <span className="font-medium text-slate-900">{seg.value}</span>
            <span className="text-xs text-slate-400">(%{Math.round((seg.value / total) * 100)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswerBreakdownDonut({ totalCorrect, totalWrong, totalEmpty }: { totalCorrect: number; totalWrong: number; totalEmpty: number }) {
  return (
    <ChartCard title="Doğru / Yanlış / Boş Dağılımı">
      <Donut
        centerLabel="soru"
        segments={[
          { label: "Doğru", value: totalCorrect, color: TONE_HEX.green },
          { label: "Yanlış", value: totalWrong, color: TONE_HEX.red },
          { label: "Boş", value: totalEmpty, color: TONE_HEX.slate },
        ]}
      />
    </ChartCard>
  );
}

function PlanStatusDonut({ planItems }: { planItems: ReportData["planItems"] }) {
  const done = planItems.filter((p) => p.status === "done").length;
  const inProgress = planItems.filter((p) => p.status === "in_progress").length;
  const notStarted = planItems.filter((p) => p.status === "not_started").length;

  return (
    <ChartCard title="Çalışma Programı İlerlemesi">
      <Donut
        centerLabel="konu"
        segments={[
          { label: "Tamamlandı", value: done, color: TONE_HEX.green },
          { label: "Devam ediyor", value: inProgress, color: TONE_HEX.amber },
          { label: "Başlanmadı", value: notStarted, color: TONE_HEX.slate },
        ]}
      />
    </ChartCard>
  );
}

// ---- Cubuk grafik: eksik analizi seviye dagilimi ----
function WeaknessBarChart({ diagnoses }: { diagnoses: ReportData["diagnoses"] }) {
  const counts = {
    none: diagnoses.filter((d) => d.weakness_level === "none").length,
    minor: diagnoses.filter((d) => d.weakness_level === "minor").length,
    major: diagnoses.filter((d) => d.weakness_level === "major").length,
  };
  const bars = [
    { label: "Güçlü (eksik yok)", value: counts.none, color: TONE_HEX.green },
    { label: "Hafif eksik", value: counts.minor, color: TONE_HEX.amber },
    { label: "Ciddi eksik", value: counts.major, color: TONE_HEX.red },
  ];
  const max = Math.max(1, ...bars.map((b) => b.value));

  if (diagnoses.length === 0) return (
    <ChartCard title="Eksik Analizi Dağılımı">
      <ChartEmpty label="Henüz analiz yok." />
    </ChartCard>
  );

  return (
    <ChartCard title="Eksik Analizi Dağılımı">
      <div className="flex flex-col gap-3">
        {bars.map((b, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-slate-600">{b.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(b.value / max) * 100}%`, backgroundColor: b.color }}
              />
            </div>
            <span className="w-5 shrink-0 text-right text-xs font-medium text-slate-700">{b.value}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export function StudentReportCharts({ data }: { data: ReportData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <AccuracyTrendChart attempts={data.attempts} />
      </div>
      <AnswerBreakdownDonut totalCorrect={data.totalCorrect} totalWrong={data.totalWrong} totalEmpty={data.totalEmpty} />
      <PlanStatusDonut planItems={data.planItems} />
      <div className="lg:col-span-2">
        <WeaknessBarChart diagnoses={data.diagnoses} />
      </div>
    </div>
  );
}
