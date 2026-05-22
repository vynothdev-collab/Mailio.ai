"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import type { ApiError } from "@/src/types/auth";
import type { BulkProgressDto, BulkUploadResponse } from "@/src/types/bulk";
import { UPLOAD_CONFIG } from "../constants";

interface Props {
  onUploaded?: () => void;
}

export function BulkVerifyCard({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file,       setFile]       = useState<File | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadPct,  setUploadPct]  = useState(0);
  const [lastUpload, setLastUpload] = useState<BulkUploadResponse | null>(null);
  const [progress,   setProgress]   = useState<BulkProgressDto | null>(null);

  useEffect(() => {
    if (!lastUpload?.jobId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const p = await bulkVerifyService.getProgress(lastUpload.jobId);
        if (cancelled) return;
        setProgress(p);
        if (p.totalCount > 0 && p.processedCount >= p.totalCount) {
          window.clearInterval(timer);
          onUploaded?.();
        }
      } catch {
      }
    };

    void tick();
    const timer = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [lastUpload?.jobId]);

  const validate = (f: File): string | null => {
    const ext = `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!UPLOAD_CONFIG.acceptedFormats.includes(ext as ".csv" | ".txt")) {
      return `Invalid file format. Only ${UPLOAD_CONFIG.acceptedFormats.join(", ")} are supported.`;
    }
    if (f.size > UPLOAD_CONFIG.maxSizeMb * 1024 * 1024) {
      return `File too large. Max ${UPLOAD_CONFIG.maxSizeMb} MB.`;
    }
    if (f.size === 0) return "File is empty.";
    return null;
  };

  const handleSelect = useCallback((f: File) => {
    const err = validate(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleSelect(dropped);
  }, [handleSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleSelect(selected);
  }, [handleSelect]);

  const reset = () => {
    setFile(null);
    setUploadPct(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const startUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadPct(0);
    try {
      const result = await bulkVerifyService.upload(file, setUploadPct);
      toast.success("File uploaded — parsing on the server…");
      setProgress(null);
      setLastUpload(result);
      reset();
      onUploaded?.();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="leading-tight">Bulk Email Verification</CardTitle>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#E6EEFB] px-2.5 py-1 text-[11px] font-semibold text-[#0F5BFF]">
            CSV / TXT
          </span>
        </div>
        <CardDescription className="mt-1">
          Upload a list and we&apos;ll verify every address — SMTP, MX, syntax, and catch-all checks.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <label
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer py-8 transition-colors select-none",
            isDragging
              ? "border-[#0F5BFF] bg-[#F4F8FF]"
              : "border-[#DCE6F3] bg-[#F4F8FF] hover:border-[#0F5BFF]/40",
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          aria-label="File drop zone"
        >
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD_CONFIG.acceptedFormats.join(",")}
            onChange={handleFileChange}
            className="sr-only"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#DCE6F3] shadow-sm">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5" stroke="#0F5BFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.1667 6.66667L10 2.5L5.83334 6.66667" stroke="#0F5BFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 2.5V12.5" stroke="#0F5BFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {file ? (
            <>
              <span className="text-sm font-medium text-primary flex items-center gap-1.5">
                <FileText size={14} /> {file.name}
                {!uploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      reset();
                    }}
                    aria-label="Remove file"
                    className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
              <span className="text-xs text-muted-foreground">Click to change file</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-[#161514]">Drag &amp; drop your file here</span>
              <span className="text-xs text-muted-foreground">
                or click to browse · {UPLOAD_CONFIG.acceptedFormats.join(" / ")} up to {UPLOAD_CONFIG.maxSizeMb}MB
              </span>
            </>
          )}
        </label>

        {file && uploading && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span>{uploadPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        )}

        <Button
          className="w-full rounded-full border-0 bg-[#0F5BFF] text-white hover:bg-[#0A4BD9] disabled:bg-[#7EA6FF] disabled:opacity-100 h-11"
          disabled={!file || uploading}
          onClick={startUpload}
        >
          {uploading ? (
            <><Loader2 size={14} className="animate-spin" /> Uploading…</>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path d="M7.5 13.75C7.5 13.75 12.5 11.25 12.5 7.5V3.125L7.5 1.25L2.5 3.125V7.5C2.5 11.25 7.5 13.75 7.5 13.75Z" stroke="white" strokeWidth="1.375" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.625 7.5L6.875 8.75L9.375 6.25" stroke="white" strokeWidth="1.375" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Upload &amp; Verify
            </>
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M9 5.5H3C2.44772 5.5 2 5.94772 2 6.5V9.5C2 10.0523 2.44772 10.5 3 10.5H9C9.55228 10.5 10 10.0523 10 9.5V6.5C10 5.94772 9.55228 5.5 9 5.5Z" stroke="#8B847A" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 5.5V4C4 3.46957 4.21071 2.96086 4.58579 2.58579C4.96086 2.21071 5.46957 2 6 2C6.53043 2 7.03914 2.21071 7.41421 2.58579C7.78929 2.96086 8 3.46957 8 4V5.5" stroke="#8B847A" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Your data is encrypted and never shared.
        </p>

        {lastUpload && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-emerald-700 truncate">
                    {lastUpload.fileName}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setLastUpload(null); setProgress(null); }}
                    aria-label="Dismiss result"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
                {(() => {
                  const isParsing  = !progress || progress.totalCount === 0;
                  const isDone     = !isParsing && progress.processedCount >= progress.totalCount;
                  const label      = isDone ? "Completed" : isParsing ? "Parsing…" : "Processing";
                  return (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold mt-0.5",
                      isDone
                        ? "border-emerald-200 text-emerald-700"
                        : "border-blue-200 bg-blue-50 text-blue-700",
                    )}>
                      {!isDone && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                      {label}
                    </span>
                  );
                })()}
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Valid</p>
                    <p className="font-semibold tabular-nums text-emerald-600">
                      {(progress?.valid ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Invalid</p>
                    <p className="font-semibold tabular-nums text-red-500">
                      {(progress?.invalid ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Risky</p>
                    <p className="font-semibold tabular-nums text-amber-600">
                      {(progress?.risky ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
