import type { SiteAnalytics } from "@/lib/reports/site-analytics";

// Admin "Analitik" sayfasi icin, harici kutuphane kullanmadan (proje
// genelindeki tercihe uygun) saf SVG/CSS ile cizilen kucuk grafik/liste
// bilesenleri: gunluk sayfa goruntuleme cubuk grafigi ve siralanmis
// yatay cubuk listeleri (en cok gezilen sayfalar, ulkeler).

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

export function DailyPageViewsChart({ dailyCounts }: { dailyCounts: SiteAnalytics["dailyCounts"] }) {
  const max = Math.max(1, ...dailyCounts.map((d) => d.count));
  const W = 760;
  const H = 160;
  const padX = 4;
  const padY = 20;
  const innerW = W - padX * 2;
  const innerH = H - padY;
  const barGap = 2;
  const barW = dailyCounts.length > 0 ? innerW / dailyCounts.length - barGap : 0;

  return (
    <Card title={`Günlük Sayfa Görüntüleme (son ${dailyCounts.length} gün)`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gunluk sayfa goruntuleme grafigi">
        {dailyCounts.map((d, i) => {
          const h = (d.count / max) * innerH;
          const x = padX + i * (barW + barGap);
          const y = H - h;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={Math.max(barW, 1)} height={h} rx={1.5} fill="#4f46e5" opacity={0.85}>
                <title>{`${d.date} — ${d.count} görüntüleme`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{dailyCounts[0]?.date}</span>
        <span>{dailyCounts[dailyCounts.length - 1]?.date}</span>
      </div>
    </Card>
  );
}

export function RankedBarList({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: { label: string; count: number }[];
  emptyLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-xs text-slate-600" title={r.label}>
                {r.label}
              </span>
              <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-700">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
