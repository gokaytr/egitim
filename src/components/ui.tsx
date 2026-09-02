import { ReactNode } from "react";
import Link from "next/link";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-3xl font-semibold text-slate-900">{value}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </Card>
  );
}

// Admin ve ogretmen Genel Bakis sayfalarinin en ustunde gorunen, siteninin en
// onemli konusu olan "soru" is akisina (ekleme/onaylama) dogrudan goturen
// buyuk, goze carpan iki kart. href'e "?tab=ekle"/"?tab=onay" gibi bir query
// verilirse ve hedef sayfadaki SimpleTabs'ta ayni ad ("tab") syncQueryParam
// olarak tanimliysa, dogrudan o sekme acilir.
export function DashboardActionCard({
  href,
  emoji,
  title,
  subtitle,
  tone = "indigo",
  badge,
}: {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
  tone?: "indigo" | "amber" | "slate";
  badge?: number;
}) {
  const toneClasses = {
    indigo: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100",
    amber: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    slate: "border-slate-300 bg-slate-100 hover:bg-slate-200",
  };
  return (
    <Link
      href={href}
      className={`flex touch-manipulation flex-col gap-2 rounded-2xl border p-6 shadow-sm transition ${toneClasses[tone]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-4xl">{emoji}</span>
        {!!badge && badge > 0 && (
          <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">{badge}</span>
        )}
      </div>
      <span className="text-xl font-semibold text-slate-900">{title}</span>
      <span className="text-sm text-slate-600">{subtitle}</span>
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      className={`touch-manipulation rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "green" | "amber" | "red" }) {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      {...props}
    />
  );
}
