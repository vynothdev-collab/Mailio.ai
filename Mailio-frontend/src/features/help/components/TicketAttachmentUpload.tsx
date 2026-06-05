"use client";

import { useRef } from "react";
import { Film, Image as ImageIcon, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const ATTACHMENT_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

export function fileTypeOf(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

export function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function TicketAttachmentUpload({ files, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const total = files.reduce((s, f) => s + f.size, 0);
  const remaining = MAX_TOTAL_BYTES - total;

  function tryAdd(picked: FileList | File[]) {
    const incoming = Array.from(picked);
    const next = [...files];
    let runningTotal = total;

    for (const f of incoming) {
      if (next.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} attachments per ticket.`);
        break;
      }
      if (!(ATTACHMENT_MIMES as readonly string[]).includes(f.type)) {
        toast.error(`${f.name}: file type not allowed.`);
        continue;
      }
      if (runningTotal + f.size > MAX_TOTAL_BYTES) {
        toast.error(`${f.name}: would exceed the 5 MB combined limit.`);
        continue;
      }
      if (next.some((existing) => existing.name === f.name && existing.size === f.size)) {
        continue; // de-dupe accidental double pick
      }
      next.push(f);
      runningTotal += f.size;
    }

    onChange(next);
  }

  function removeAt(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#111827] flex items-center gap-1.5">
          <Paperclip size={11} /> Attachments
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <span className="text-[10px] text-muted-foreground">
          {fmtSize(total)} / 5 MB · {files.length}/{MAX_FILES}
        </span>
      </div>

      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || remaining <= 0 || files.length >= MAX_FILES}
        className="w-full rounded-xl border border-dashed border-[#DCE6F3] bg-[#F4F8FF]/60 px-3 py-4 text-xs text-muted-foreground hover:bg-[#F4F8FF] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Click to add images or videos · JPG / PNG / WEBP / MP4 / WEBM / MOV
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_MIMES.join(",")}
        onChange={(e) => {
          if (e.target.files) tryAdd(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      {files.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map((f, i) => {
            const kind = fileTypeOf(f.type);
            const preview = kind === "image" ? URL.createObjectURL(f) : null;
            return (
              <li
                key={`${f.name}-${f.size}`}
                className="relative rounded-lg border border-[#DCE6F3] bg-white overflow-hidden group"
              >
                <div className="aspect-video bg-[#F4F8FF] flex items-center justify-center overflow-hidden">
                  {preview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={preview}
                      alt={f.name}
                      onLoad={() => URL.revokeObjectURL(preview)}
                      className="object-cover w-full h-full"
                    />
                  ) : kind === "video" ? (
                    <Film size={22} className="text-[#0B47CF]" />
                  ) : (
                    <ImageIcon size={22} className="text-muted-foreground" />
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[11px] font-medium truncate" title={f.name}>{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtSize(f.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  disabled={disabled}
                  aria-label="Remove attachment"
                  className="absolute top-1 right-1 inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/90 border border-[#DCE6F3] text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-50"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
