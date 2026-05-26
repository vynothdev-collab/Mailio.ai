import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col overflow-hidden bg-gradient-to-b from-[#0B47CF] to-[#082E9E] px-12 py-10 text-white">
        {/* Decorative blurs */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-white/5 blur-3xl" />

        {/* Logo */}
        <div className="relative">
          <Image
            src="/auth-brand.svg"
            alt="mailanswer.ai"
            width={320}
            height={65}
            className="h-auto w-[320px]"
            priority
            draggable={false}
          />
        </div>

        {/* Headline */}
        <div className="relative mt-12 max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Powerful Admin.<br />Smarter Control.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/85">
            Manage users, plans, analytics and email verification — all from one dashboard.
          </p>
        </div>

        {/* Product image */}
        <div className="relative mt-auto flex items-end justify-center">
          <Image
            src="/login.png"
            alt="mailanswer.ai admin dashboard"
            width={620}
            height={400}
            className="h-auto w-full max-w-[620px] select-none"
            priority
          />
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-canvas px-5 py-8 sm:px-6 sm:py-10 lg:px-16">
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
      </div>
    </div>
  );
}
