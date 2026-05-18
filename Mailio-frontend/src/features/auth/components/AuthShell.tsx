import Link from "next/link";
import { Zap, ShieldCheck, BarChart3, Zap as ZapIcon, CheckCircle2 } from "lucide-react";

const FEATURES = [
  { icon: ShieldCheck, text: "99.9% accuracy with real-time mailbox checks" },
  { icon: BarChart3,   text: "Bulk verify up to 10 million emails per batch" },
  { icon: ZapIcon,     text: "Results in seconds via REST API or dashboard" },
] as const;

const STATS = [
  { value: "124K+",  label: "Emails verified daily" },
  { value: "94.2%",  label: "Average valid rate"     },
  { value: "10,000+", label: "Teams worldwide"       },
] as const;

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[52%] flex-col justify-between overflow-hidden bg-[#0f172a] px-12 py-10 text-white">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />

      <Link href="/" className="relative flex items-center gap-2.5 w-fit">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand shadow-lg">
          <Zap size={18} className="text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          mailio<span className="text-brand-400">.ai</span>
        </span>
      </Link>

      <div className="relative space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-xs font-medium text-brand-300">Email verification platform</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Verify emails at<br />
            <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
              scale, instantly.
            </span>
          </h1>
          <p className="text-base text-slate-400 leading-relaxed max-w-sm">
            Clean your contact lists, reduce bounce rates, and protect your sender reputation before every campaign.
          </p>
        </div>

        <ul className="space-y-3">
          {FEATURES.map(({ text }) => (
            <li key={text} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20">
                <CheckCircle2 size={13} className="text-brand-400" />
              </div>
              <span className="text-sm text-slate-300">{text}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
              <p className="mt-0.5 text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <blockquote className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <p className="text-sm text-slate-300 leading-relaxed">
          &ldquo;Mailio.ai cut our bounce rate from 8% down to 0.4% overnight. Our deliverability has never been better.&rdquo;
        </p>
        <footer className="mt-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-white text-xs font-bold">
            SR
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Sarah Reynolds</p>
            <p className="text-xs text-slate-500">Head of Growth, Acme Corp</p>
          </div>
        </footer>
      </blockquote>
    </div>
  );
}

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex h-full min-h-screen">
      <BrandPanel />

      <div className="flex flex-1 flex-col items-center justify-center bg-canvas px-6 py-12 lg:px-16">
        <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
            <Zap size={15} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            mailio<span className="text-primary">.ai</span>
          </span>
        </Link>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
