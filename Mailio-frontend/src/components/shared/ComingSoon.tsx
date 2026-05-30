type ComingSoonProps = {
  description?: string;
};

export function ComingSoon({
  description = "We're building something amazing.",
}: ComingSoonProps) {
  return (
    <div className="relative -mx-4 -mb-4 flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#EEF3FB] px-4 py-10 sm:px-6 lg:-mx-6 lg:-mb-6">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-[220px] w-[220px] rounded-full"
        style={{ background: "radial-gradient(circle at center, rgba(110, 231, 183, 0.45), rgba(167, 243, 208, 0.2) 50%, transparent 75%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-[220px] w-[220px] rounded-full"
        style={{ background: "radial-gradient(circle at center, rgba(96, 165, 250, 0.4), rgba(191, 219, 254, 0.2) 50%, transparent 75%)" }}
        aria-hidden
      />

      <div className="relative flex w-full max-w-xl flex-col items-center text-center">
        <img
          src="/brand-logo.svg"
          alt="emailanswers.ai"
          className="mb-6 h-16 w-auto sm:h-20 md:h-24"
        />
        <h1 className="text-4xl font-extrabold tracking-tight text-[#2356F6] sm:text-6xl md:text-7xl">
          Coming Soon
        </h1>
        <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      <p className="absolute bottom-6 left-0 right-0 px-4 text-center text-xs text-muted-foreground/80 sm:bottom-8">
        Stay tuned for the revolution in email automation
      </p>
    </div>
  );
}
