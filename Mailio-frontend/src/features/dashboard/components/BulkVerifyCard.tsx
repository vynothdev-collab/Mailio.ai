"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, ShieldCheck, Loader2, X, CheckCircle2 } from "lucide-react";
import Image from "next/image";
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
          <div>
            <CardTitle>Bulk Email Verification</CardTitle>
            <CardDescription>
              Upload a CSV or TXT file and we&apos;ll verify every email.
            </CardDescription>
          </div>
          <a
            href="/sample-emails.csv"
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <Image src="/excel.svg" alt="" width={14} height={14} className="shrink-0" />
            Sample CSV
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <label
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer py-8 transition-colors select-none",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30",
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
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            isDragging ? "bg-primary/10" : "bg-background border border-border",
          )}>
            <UploadCloud size={20} className={cn(isDragging ? "text-primary" : "text-muted-foreground")} />
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
              <span className="text-sm font-medium">Drag &amp; drop your file here</span>
              <span className="text-xs text-muted-foreground">
                {UPLOAD_CONFIG.acceptedFormats.join(" or ")} up to {UPLOAD_CONFIG.maxSizeMb}MB
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
          className="w-full gradient-accent border-0 text-white hover:opacity-90"
          disabled={!file || uploading}
          onClick={startUpload}
        >
          {uploading
            ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
            : "Upload & Verify"}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck size={12} />
          Your data is secure and never shared.
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
