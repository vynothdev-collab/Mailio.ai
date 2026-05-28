type ComingSoonProps = {
  description?: string;
};

export function ComingSoon({
  description = "We're building something amazing. Get notified when EmailAnswers AI launches.",
}: ComingSoonProps) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[100vh] sm:min-h-[90vh] overflow-hidden px-4 sm:px-6 py-10">
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15, 23, 42, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -top-32 -right-32 h-[320px] w-[320px] sm:h-[480px] sm:w-[480px] rounded-full -z-10"
        style={{
          background:
            "radial-gradient(circle at center, rgba(167, 243, 208, 0.55), rgba(167, 243, 208, 0.2) 55%, transparent 75%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-28 h-[280px] w-[280px] sm:h-[420px] sm:w-[420px] rounded-full -z-10"
        style={{
          background:
            "radial-gradient(circle at center, rgba(191, 219, 254, 0.65), rgba(191, 219, 254, 0.25) 55%, transparent 75%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-16 sm:-right-20 h-[200px] w-[200px] sm:h-[300px] sm:w-[300px] rounded-full -translate-y-1/2 -z-10"
        style={{
          background:
            "radial-gradient(circle at center, rgba(187, 247, 208, 0.5), rgba(187, 247, 208, 0.18) 55%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      <div className="flex flex-col items-center text-center w-full max-w-xl">
        <img
          src="/brand-logo.svg"
          alt="EmailAnswers.ai"
          className="h-16 sm:h-20 md:h-24 w-auto mb-6 sm:mb-8"
        />
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-blue-700 mb-4 sm:mb-5">
          Coming Soon
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md px-2">
          {description}
        </p>
      </div>

      <p className="absolute bottom-6 sm:bottom-8 left-0 right-0 text-center text-xs text-muted-foreground/80 px-4">
        Stay tuned for the revolution in email automation
      </p>
    </div>
  );
}
