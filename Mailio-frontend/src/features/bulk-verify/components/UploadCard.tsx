"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  UploadCloud, FileText, X, CheckCircle2, Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { bulkVerifyService } from "@/src/services/bulkVerifyService";
import { scanEmailFile, type FileScanResult } from "../lib/scanFile";
import type { ApiError } from "@/src/types/auth";
import type { BulkUploadResponse } from "@/src/types/bulk";

const ACCEPTED_EXTS = [".csv", ".txt"] as const;
const MAX_SIZE_MB   = 50;

interface Props {
  onUploaded: (result: BulkUploadResponse) => void;
}

export function UploadCard({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file,        setFile]        = useState<File | null>(null);
  const [scan,        setScan]        = useState<FileScanResult | null>(null);
  const [scanError,   setScanError]   = useState<string | null>(null);
  const [isDragging,  setIsDragging]  = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [uploaded,    setUploaded]    = useState<BulkUploadResponse | null>(null);

  const validate = (f: File): string | null => {
    const ext = `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED_EXTS.includes(ext as ".csv" | ".txt")) {
      return "Invalid file format. Only .csv and .txt files are supported.";
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Max ${MAX_SIZE_MB} MB.`;
    }
    if (f.size === 0) {
      return "File is empty.";
    }
    return null;
  };

  const handleSelect = useCallback(async (f: File) => {
    const err = validate(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setUploaded(null);
    setScan(null);
    setScanError(null);
    setScanning(true);
    try {
      const result = await scanEmailFile(f);
      if (result.validEmails.length === 0) {
        setScanError("No valid email addresses were found in this file.");
      }
      setScan(result);
    } catch {
      setScanError("Could not read this file. It may be corrupted.");
    } finally {
      setScanning(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) void handleSelect(f);
    },
    [handleSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void handleSelect(f);
    },
    [handleSelect],
  );

  const reset = () => {
    setFile(null);
    setScan(null);
    setScanError(null);
    setUploaded(null);
    setUploadPct(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const startUpload = async () => {
    if (!file || !scan || scan.validEmails.length === 0) return;
    setUploading(true);
    setUploadPct(0);
    try {
      const result = await bulkVerifyService.upload(file, setUploadPct);
      toast.success(
        `Queued ${scan.validEmails.length.toLocaleString()} emails — parsing on the server…`,
      );
      onUploaded(result);
      reset();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const canUpload = !!scan && scan.validEmails.length > 0 && !uploaded;
  const hasInvalid = !!scan && scan.invalidEntries.length > 0;

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
          <span className="mt-2 text-base font-semibold text-[#111827]">Drag &amp; drop your file here</span>
          <span className="text-xs text-muted-foreground">CSV or TXT up to {MAX_SIZE_MB}MB</span>
          <span className="mt-2 inline-flex items-center justify-center rounded-full bg-[#0F5BFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0a48cc] transition-colors">
            Choose file
          </span>
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

        {file && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={15} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{file.name}</span>
                {uploaded && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={10} />
                    Queued
                  </span>
                )}
              </div>
              <button
                onClick={reset}
                disabled={uploading}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="Remove file"
              >
                <X size={15} />
              </button>
            </div>

            {scanning && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                Scanning file…
              </div>
            )}

            {scanError && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle size={12} /> {scanError}
                </p>
                <p className="mt-1">
                  Check the file follows the format shown above and try again.
                </p>
              </div>
            )}

            {scan && !scanError && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border">
                  <Stat label="Rows scanned"     value={scan.totalRows.toLocaleString()} />
                  <Stat label="Valid emails"     value={scan.validEmails.length.toLocaleString()} valueClass="text-emerald-600" />
                  <Stat label="Invalid entries" value={scan.invalidEntries.length.toLocaleString()} valueClass={hasInvalid ? "text-amber-600" : ""} />
                  <Stat label="Duplicates"       value={scan.duplicates.toLocaleString()}    valueClass={scan.duplicates > 0 ? "text-amber-600" : ""} />
                </div>

                {hasInvalid && (
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle size={12} />
                      {scan.invalidEntries.length} entr{scan.invalidEntries.length === 1 ? "y is" : "ies are"} not in the proper email format
                    </p>
                    <p className="mt-1">
                      These rows will be skipped during verification. Expected format: <code className="font-mono">name@example.com</code>
                    </p>
                    <ul className="mt-2 space-y-0.5 font-mono">
                      {scan.invalidEntries.slice(0, 5).map((e) => (
                        <li key={e.row} className="truncate">
                          Row {e.row}: <span className="text-amber-900">&ldquo;{e.value || "(empty)"}&rdquo;</span>
                        </li>
                      ))}
                      {scan.invalidEntries.length > 5 && (
                        <li className="text-amber-700">+{scan.invalidEntries.length - 5} more…</li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            )}

            {!uploaded && (
              <div className="space-y-2">
                {uploading && (
                  <>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uploading…</span>
                      <span>{uploadPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${uploadPct}%` }}
                      />
                    </div>
                  </>
                )}
                <Button
                  type="button"
                  onClick={startUpload}
                  disabled={!canUpload || uploading}
                  className="w-full gradient-brand border-0 text-white hover:opacity-90"
                >
                  {uploading
                    ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                    : scan
                      ? `Validate ${scan.validEmails.length.toLocaleString()} email${scan.validEmails.length === 1 ? "" : "s"}`
                      : "Validate All"}
                </Button>
              </div>
            )}

          </div>
        )}

        <TemplateGuide />
        <PrivacyBanner />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums truncate", valueClass)}>{value}</p>
    </div>
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
    "No empty rows.",
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
