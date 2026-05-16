"use client";

import { useState } from "react";
import { FileText, Braces, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import type { ApiError } from "@/src/types/auth";

const FORMATS: { label: string; ext: string; format: "csv" | "json"; Icon: React.ElementType }[] = [
  { label: "Download as CSV",  ext: ".csv",  format: "csv",  Icon: FileText },
  { label: "Download as JSON", ext: ".json", format: "json", Icon: Braces   },
];

interface Props {
  jobId: string | null;
}

export function DownloadReportCard({ jobId }: Props) {
  const [busy, setBusy] = useState<"csv" | "json" | null>(null);

  const handleDownload = async (format: "csv" | "json") => {
    if (!jobId) return;
    setBusy(format);
    try {
      await bulkVerifyService.download(jobId, format, "full");
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Download failed.");
    } finally {
      setBusy(null);
    }
  };

  const disabled = !jobId;

  return (
    <Card>
      <CardContent className="pt-2 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Download Report</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {disabled
              ? "No completed job to download."
              : "Download cleaned list or full verification report."}
          </p>
        </div>

        <div className="space-y-2">
          {FORMATS.map(({ label, ext, format, Icon }) => (
            <button
              key={ext}
              type="button"
              disabled={disabled || busy !== null}
              onClick={() => handleDownload(format)}
              className={cn(
                "flex items-center justify-between w-full h-9 px-3 rounded-md border border-input text-sm font-medium transition-colors",
                disabled || busy !== null
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                {busy === format
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Icon size={14} className="text-muted-foreground" />}
                {label}
              </span>
              <span className="text-xs text-muted-foreground font-mono">{ext}</span>
            </button>
          ))}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={11} />
          Reports are available for 7 days.
        </p>
      </CardContent>
    </Card>
  );
}
