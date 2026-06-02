import Image from "next/image";

const features = [
  {
    icon: (
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    iconBg: "bg-[#2563EB]",
    title: "User & Role Management",
    desc: "Manage admins, teams, and permissions seamlessly.",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    iconBg: "bg-[#D97706]",
    title: "Plan & Subscription Control",
    desc: "Create and manage plans, credits, and renewals.",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    iconBg: "bg-[#059669]",
    title: "Powerful Analytics",
    desc: "Real-time insights to grow and optimize your platform.",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    iconBg: "bg-[#7C3AED]",
    title: "Secure & Reliable",
    desc: "Enterprise-grade security for your peace of mind.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel ── */}
      <div className="relative hidden lg:flex lg:w-[42%] flex-col items-center justify-center overflow-hidden bg-[#0D1B4B] px-12 py-10 text-white">
        {/* Decorative blurs */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[22rem] w-[22rem] rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
          {/* Logo */}
          <Image
            src="/brand-logo-white.svg"
            alt="mailanswer.ai"
            width={200}
            height={44}
            className="h-auto w-[200px]"
            priority
            draggable={false}
          />

          {/* Headline */}
          <div className="mt-10">
            <h1 className="font-serif text-4xl font-bold leading-snug tracking-tight">
              Super Admin<br />
              <span className="text-[#60A5FA] italic">Control Center</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Sign in to manage users, plans, billing, credits,<br />
              analytics, and platform settings securely.
            </p>
          </div>

          {/* Feature list */}
          <div className="mt-10 w-full space-y-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-3 text-left">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${f.iconBg}`}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide text-white">{f.title}</p>
                  <p className="text-xs text-white/55 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Secure admin badge */}
          <div className="mt-8 flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-medium text-emerald-400">Secure Admin Access &nbsp;·&nbsp; <span className="font-normal text-white/50">Authorized personnel only</span></p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F4F6FB] px-5 py-8 sm:px-6 sm:py-10 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-6 lg:hidden">
          <Image
            src="/brand-logo.svg"
            alt="mailanswer.ai"
            width={200}
            height={46}
            className="h-auto w-[180px] sm:w-[200px]"
            priority
            draggable={false}
          />
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>

        {/* Copyright */}
        <p className="mt-8 text-xs text-gray-400">© 2026 emailanswers.ai. All rights reserved.</p>
      </div>
    </div>
  );
}
