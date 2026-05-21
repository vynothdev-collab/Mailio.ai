export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand-logo.svg"
      alt="emailanswers.ai"
      className={className}
      draggable={false}
    />
  );
}
