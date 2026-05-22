import Image from "next/image";
import Link from "next/link";

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col overflow-hidden bg-gradient-to-b from-[#0B47CF] to-[#082E9E] px-12 py-10 text-white">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-white/5 blur-3xl" />

      <Link href="/" className="relative w-fit" aria-label="emailanswers.ai home">
        <Image
          src="/auth-brand.svg"
          alt="emailanswers.ai"
          width={320}
          height={65}
          className="h-auto w-[320px]"
          priority
        />
      </Link>

      <div className="relative mt-12 max-w-md">
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          AI-Powered Answers.
          <br />
          Smarter Workflows.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-white/85">
          Automate responses, manage project and grow your business - all in
          one place
        </p>
      </div>

      <div className="relative mt-auto flex items-end justify-center">
        <Image
          src="/login.png"
          alt=""
          width={620}
          height={400}
          className="h-auto w-full max-w-[620px] select-none"
          priority
        />
      </div>
    </div>
  );
}

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <div className="flex flex-1 flex-col items-center justify-center bg-[#f3f4f8] px-5 py-8 sm:px-6 sm:py-10 lg:px-16">
        <Link
          href="/"
          className="mb-6 flex items-center gap-2 lg:hidden"
          aria-label="emailanswers.ai home"
        >
          <Image
            src="/auth-brand.svg"
            alt="emailanswers.ai"
            width={160}
            height={33}
            className="h-auto w-[160px]"
            priority
          />
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
