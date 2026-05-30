"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud, FileText, X, Trash2, CheckCircle2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import type { ApiError } from "@/src/types/auth";
import type { BulkProgressDto, BulkUploadResponse } from "@/src/types/bulk";

const ACCEPTED_EXTS = [".csv", ".txt"] as const;
const MAX_SIZE_MB   = 50;

interface Props {
  onUploaded: (result: BulkUploadResponse) => void;
}

export function UploadCard({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file,       setFile]       = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
          onUploaded(lastUpload);
        }
      } catch { /* ignore */ }
    };

    void tick();
    const timer = window.setInterval(tick, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [lastUpload?.jobId]);

  const validate = (f: File): string | null => {
    const ext = `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED_EXTS.includes(ext as ".csv" | ".txt"))
      return "Invalid file format. Only .csv and .txt files are supported.";
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `File too large. Max ${MAX_SIZE_MB} MB.`;
    if (f.size === 0) return "File is empty.";
    return null;
  };

  const handleSelect = useCallback((f: File) => {
    const err = validate(f);
    if (err) { toast.error(err); return; }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleSelect(f);
  }, [handleSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleSelect(f);
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
      onUploaded(result);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-2 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#111827]">Upload Email List</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Upload a CSV or TXT file with email addresses.
            </p>
          </div>
          <a
            href="/sample-emails.csv"
            download
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#DCE6F3] bg-[#F4F8FF] px-3 py-1.5 text-xs font-semibold text-[#0F5BFF] hover:bg-[#E6EEFB] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M12.25 8.75V11.0833C12.25 11.3928 12.1271 11.6895 11.9083 11.9083C11.6895 12.1271 11.3928 12.25 11.0833 12.25H2.91667C2.60725 12.25 2.3105 12.1271 2.09171 11.9083C1.87292 11.6895 1.75 11.3928 1.75 11.0833V8.75" stroke="#0F5BFF" strokeWidth="1.28333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.08325 5.83325L6.99992 8.74992L9.91659 5.83325" stroke="#0F5BFF" strokeWidth="1.28333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 8.75V1.75" stroke="#0F5BFF" strokeWidth="1.28333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download Template
          </a>
        </div>

        {/* Drop zone */}
        <label
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer py-12 transition-colors",
            isDragging
              ? "border-[#0F5BFF] bg-[#F4F8FF]"
              : "border-[#DCE6F3] bg-[#F4F8FF] hover:border-[#0F5BFF]/40",
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleChange}
            className="sr-only"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6EEFB]">
            <UploadCloud size={22} className="text-[#0F5BFF]" />
          </div>

          {file ? (
            <>
              <span className="text-sm font-medium text-primary flex items-center gap-1.5">
                <FileText size={14} />
                {file.name}
                {!uploading && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); reset(); }}
                    aria-label="Remove file"
                    className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </span>
              <span className="text-xs text-muted-foreground">Click to change file</span>
            </>
          ) : (
            <>
              <span className="mt-2 text-base font-semibold text-[#111827]">Drag &amp; drop your file here</span>
              <span className="text-xs text-muted-foreground">CSV or TXT up to {MAX_SIZE_MB}MB</span>
              <span className="mt-2 inline-flex items-center justify-center rounded-full bg-[#0F5BFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0a48cc] transition-colors">
                Choose file
              </span>
            </>
          )}
        </label>

        <div className="flex items-start gap-2 rounded-xl border border-[#DCE6F3] bg-[#F4F8FF] px-3 py-2.5 text-xs text-[#161514]">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0F5BFF]">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M5 6.667V5M5 3.333h.004" stroke="white" strokeWidth="1" strokeLinecap="round"/>
              <circle cx="5" cy="5" r="4" stroke="white" strokeWidth="0.8"/>
            </svg>
          </div>
          Only email addresses are supported. Duplicates will be automatically removed.
        </div>

        {/* Upload progress */}
        {uploading && (
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

        {/* Upload button */}
        <Button
          type="button"
          onClick={startUpload}
          disabled={!file || uploading}
          className="w-full gradient-brand border-0 text-white hover:opacity-90 h-11"
        >
          {uploading
            ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
            : "Upload & Verify"}
        </Button>

        {/* Post-upload live progress card */}
        {lastUpload && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
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
                    aria-label="Dismiss"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
                {(() => {
                  const isParsing = !progress || progress.totalCount === 0;
                  const isDone    = !isParsing && progress.processedCount >= progress.totalCount;
                  const label     = isDone ? "Completed" : isParsing ? "Parsing…" : "Processing";
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
                    <p className="text-[10px] text-muted-foreground">Catchall</p>
                    <p className="font-semibold tabular-nums text-amber-600">
                      {(progress?.catchall ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <TemplateGuide />
        <PrivacyBanner />
      </CardContent>
    </Card>
  );
}

function GreenCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M8.33341 2.5L3.75008 7.08333L1.66675 5" stroke="#14A055" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TemplateGuide() {
  const sampleRows = [
    { num: 1, value: "Email" },
    { num: 2, value: "john@example.com" },
    { num: 3, value: "sarah@gmail.com" },
    { num: 4, value: "hello@company.co" },
    { num: 5, value: "info@website.org" },
  ];
  const rules = [
    'Only one column with the header "Email".',
    "Each row must contain one email address.",
    "File must be saved as CSV or TXT (UTF-8).",
    "Maximum file size: 50MB.",
  ];
  return (
    <div className="mt-4 border-t border-[#DCE6F3] pt-5">
      <h3 className="text-base font-bold text-[#111827]">How the template should look</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Your file must contain only one column: <span className="font-semibold text-[#111827]">Email</span>
      </p>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-[#DCE6F3] font-mono text-xs">
          <div className="border-b border-[#DCE6F3] bg-[#F4F8FF] px-3 py-1.5 text-center font-semibold text-[#8B847A]">A</div>
          {sampleRows.map((row, i) => (
            <div
              key={row.num}
              className={cn(
                "flex items-center gap-3 px-3 py-1.5",
                i < sampleRows.length - 1 && "border-b border-[#DCE6F3]",
                i === 0 && "font-semibold text-[#111827]",
              )}
            >
              <span className="w-4 text-right text-[#8B847A]">{row.num}</span>
              <span className="truncate">{row.value}</span>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm font-semibold text-[#111827]">Rules to follow</p>
          <ul className="mt-2 space-y-2.5">
            {rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-xs text-[#161514]">
                <span className="mt-0.5 shrink-0"><GreenCheck /></span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PrivacyBanner() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#E0D4FC] bg-[#F4EEFE] px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8.00008 14.6666C8.00008 14.6666 13.3334 11.9999 13.3334 7.99992V3.33325L8.00008 1.33325L2.66675 3.33325V7.99992C2.66675 11.9999 8.00008 14.6666 8.00008 14.6666Z" stroke="#7C3AED" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 8.00008L7.33333 9.33341L10 6.66675" stroke="#7C3AED" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-[#7C3AED]">We respect your privacy</p>
        <p className="mt-0.5 text-xs text-[#5B21B6]">
          Your data is 100% secure. We do not sell or share your email lists.
        </p>
      </div>
    </div>
  );
}
