"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Film, Image as ImageIcon, Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ATTACHMENT_MIMES,
  formatFileSize,
  getAttachmentFileType,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  namePastedFile,
  validateTicketAttachments,
} from "./ticket-attachments-utils";

interface Props {
  files:         File[];
  onFilesChange: (files: File[]) => void;
  disabled?:     boolean;
  children?:     ReactNode;
  className?:    string;
}

/**
 * Modern chat-style composer for the admin reply textarea: plus icon picker,
 * drag/drop overlay, paste-from-clipboard support, preview chips, total/count
 * counter. Validation matches the backend.
 */
export function TicketAttachmentInput({
  files,
  onFilesChange,
  disabled,
  children,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  const total = files.reduce((s, f) => s + f.size, 0);
  const limitReached = files.length >= MAX_FILES || total >= MAX_TOTAL_BYTES;

  const addFiles = useCallback(
    (incoming: File[]) => {
      const { accepted, errors } = validateTicketAttachments(files, incoming);
      errors.forEach((e) => toast.error(e));
      if (accepted.length !== files.length) onFilesChange(accepted);
    },
    [files, onFilesChange],
  );

  function openPicker() {
    if (disabled || limitReached) return;
    inputRef.current?.click();
  }

  function removeAt(idx: number) {
    onFilesChange(files.filter((_, i) => i !== idx));
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current += 1;
    if (e.dataTransfer?.types?.includes("Files")) setDragActive(true);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragActive(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (dropped.length) addFiles(dropped);
  }
  function onPaste(e: React.ClipboardEvent) {
    if (disabled) return;
    const pasted = Array.from(e.clipboardData?.files ?? []);
    if (pasted.length === 0) return;
    e.preventDefault();
    addFiles(pasted.map((f, i) => namePastedFile(f, i)));
  }

  return (
    <div
      className={`relative rounded-xl border bg-white transition-colors ${
        dragActive
          ? "border-primary-600 ring-2 ring-primary-200/50"
          : "border-gray-200"
      } ${className}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={onPaste}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_MIMES.join(",")}
        onChange={(e) => {
          if (e.target.files) addFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
        className="hidden"
      />

      {children}

      {files.length > 0 && (
        <div className="px-3 pt-3 pb-1 border-t border-gray-100">
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {files.map((f, i) => {
              const kind = getAttachmentFileType(f);
              const preview = kind === "image" ? URL.createObjectURL(f) : null;
              return (
                <li
                  key={`${f.name}-${f.size}-${i}`}
                  className="relative rounded-lg border border-gray-200 bg-white overflow-hidden group"
                >
                  <div className="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden">
                    {preview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={preview}
                        alt={f.name}
                        onLoad={() => URL.revokeObjectURL(preview)}
                        className="object-cover w-full h-full"
                      />
                    ) : kind === "video" ? (
                      <Film className="w-5 h-5 text-primary-600" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-text-muted" />
                    )}
                  </div>
                  <div className="px-2 py-1">
                    <p className="text-[11px] font-medium text-text-primary truncate" title={f.name}>
                      {f.name}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {formatFileSize(f.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { removeAt(i); toast.success("Attachment removed."); }}
                    disabled={disabled}
                    aria-label="Remove attachment"
                    className="absolute top-1 right-1 inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/90 border border-gray-200 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled || limitReached}
            aria-label="Add attachment"
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-gray-200 text-primary-600 hover:bg-primary-50/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
          </button>
          <span className="text-[10px] text-text-muted ml-1">
            {formatFileSize(total)} / 5 MB · {files.length}/{MAX_FILES}
          </span>
        </div>
      </div>

      {dragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-primary-50/40 pointer-events-none">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 bg-white rounded-full px-3 py-1.5 border border-primary-200 shadow-sm">
            <Paperclip className="w-3 h-3" /> Drop to attach
          </div>
        </div>
      )}
    </div>
  );
}
