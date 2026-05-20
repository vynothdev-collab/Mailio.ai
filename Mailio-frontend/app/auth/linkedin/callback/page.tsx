import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CallbackClient from "./CallbackClient";

export const dynamic = "force-dynamic";

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Completing LinkedIn sign-in…
      </div>
    </div>
  );
}

export default function LinkedinCallbackPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CallbackClient />
    </Suspense>
  );
}
