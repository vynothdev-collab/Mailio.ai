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
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;

  variant?: "composer" | "attachOnly";

  children?: ReactNode;
  className?: string;
}

export function TicketAttachmentInput({
  files,
  onFilesChange,
  disabled,
  variant = "composer",
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
      if (accepted.length !== files.length) {
        onFilesChange(accepted);
      }
    },
    [files, onFilesChange]
  );

  function openPicker() {
    if (disabled || limitReached) return;
    inputRef.current?.click();
  }

  function removeAt(idx: number) {
    const next = files.filter((_, i) => i !== idx);
    onFilesChange(next);
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
    const named = pasted.map((f, i) => namePastedFile(f, i));
    addFiles(named);
  }

  const hiddenInput = (
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
  );

  const previewGrid = files.length > 0 && (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {files.map((f, i) => {
        const kind = getAttachmentFileType(f);
        const preview = kind === "image" ? URL.createObjectURL(f) : null;
        return (
          <li
            key={`${f.name}-${f.size}-${i}`}
            className="relative rounded-lg border border-[#DCE6F3] bg-white overflow-hidden group"
          >
            <div className="aspect-video bg-[#F4F8FF] flex items-center justify-center overflow-hidden">
              {preview ? (
                <img
                  src={preview}
                  alt={f.name}
                  onLoad={() => URL.revokeObjectURL(preview)}
                  className="object-cover w-full h-full"
                />
              ) : kind === "video" ? (
                <Film size={20} className="text-[#0B47CF]" />
              ) : (
                <ImageIcon size={20} className="text-muted-foreground" />
              )}
            </div>
            <div className="px-2 py-1">
              <p className="text-[11px] font-medium truncate" title={f.name}>
                {f.name}
              </p>
              <p className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                removeAt(i);
                toast.success("Attachment removed.");
              }}
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
  );

  const dragOverlay = dragActive && (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#0B47CF]/5 pointer-events-none">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#0B47CF] bg-white rounded-full px-3 py-1.5 border border-[#0B47CF]/30 shadow-sm">
        <Paperclip size={12} /> Drop to attach
      </div>
    </div>
  );

  if (variant === "attachOnly") {
    return (
      <div
        className={`relative space-y-2 ${className}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPaste={onPaste}
      >
        {hiddenInput}

        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[#111827] flex items-center gap-1.5">
            <Paperclip size={11} /> Attachments
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <span className="text-[10px] text-muted-foreground">
            {formatFileSize(total)} / 5 MB · {files.length}/{MAX_FILES}
          </span>
        </div>

        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || limitReached}
          className={`w-full rounded-xl border border-dashed px-3 py-4 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            dragActive
              ? "border-[#0B47CF] bg-[#EEF3FB] text-[#0B47CF]"
              : "border-[#DCE6F3] bg-[#F4F8FF]/60 text-muted-foreground hover:bg-[#F4F8FF]"
          }`}
        >
          Click to add images or videos · drop or paste also works · JPG / PNG / WEBP / MP4 / WEBM /
          MOV
        </button>

        {previewGrid}
        {dragOverlay}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl border bg-white transition-colors ${
        dragActive ? "border-[#0B47CF] ring-2 ring-[#0B47CF]/15" : "border-[#DCE6F3]"
      } ${className}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={onPaste}
    >
      {hiddenInput}
      {children}

      {files.length > 0 && (
        <div className="px-3 pt-3 pb-1 border-t border-[#DCE6F3]/60">{previewGrid}</div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[#DCE6F3]/60">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled || limitReached}
            aria-label="Add attachment"
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-[#DCE6F3] text-[#0B47CF] hover:bg-[#F4F8FF] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={13} />
          </button>
          <span className="text-[10px] text-muted-foreground ml-1">
            {formatFileSize(total)} / 5 MB · {files.length}/{MAX_FILES}
          </span>
        </div>
      </div>

      {dragOverlay}
    </div>
  );
}
