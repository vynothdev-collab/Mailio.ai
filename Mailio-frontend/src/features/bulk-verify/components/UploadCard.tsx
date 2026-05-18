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
            <h2 className="text-sm font-semibold">Upload Email List</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a CSV or TXT file and we&apos;ll verify every email.
            </p>
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

        <label
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer py-10 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30",
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
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
            isDragging ? "bg-primary/10" : "bg-muted",
          )}>
            <UploadCloud size={22} className={isDragging ? "text-primary" : "text-muted-foreground"} />
          </div>
          <span className="text-sm font-medium">Drag &amp; drop your file here</span>
          <span className="text-xs text-muted-foreground">CSV or TXT up to {MAX_SIZE_MB}MB</span>
          <span className="mt-1 inline-flex items-center justify-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/70">
            Choose file
          </span>
        </label>

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
