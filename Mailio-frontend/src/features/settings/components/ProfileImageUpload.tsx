"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { userService } from "@/src/services/userService";
import type { ApiError } from "@/src/types/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface Props {
  name: string;
  email: string;

  profileImageViewUrl: string | null;

  hasImage: boolean;
  onUpdated: () => Promise<unknown>;
}

export function ProfileImageUpload({
  name,
  email,
  profileImageViewUrl,
  hasImage,
  onUpdated,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayUrl = previewUrl ?? profileImageViewUrl;

  function openPicker() {
    if (busy) return;
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 2 MB or smaller.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setBusy(true);
    try {
      await userService.uploadProfileImage(file);
      await onUpdated();
      toast.success("Profile image updated.");
    } catch (err) {
      setPreviewUrl(null);
      toast.error((err as ApiError)?.message ?? "Failed to upload image.");
    } finally {
      setBusy(false);

      URL.revokeObjectURL(localUrl);
      setPreviewUrl(null);
    }
  }

  async function handleRemove() {
    if (busy || !hasImage) return;
    setBusy(true);
    try {
      await userService.deleteProfileImage();
      await onUpdated();
      toast.success("Profile image removed.");
    } catch (err) {
      toast.error((err as ApiError)?.message ?? "Failed to remove image.");
    } finally {
      setBusy(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl bg-[#F4F8FF] px-4 py-4">
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={openPicker}
          disabled={busy}
          aria-label="Change profile image"
          className="group relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full overflow-hidden bg-[#0B47CF] text-white text-base sm:text-lg font-bold shadow-sm select-none disabled:opacity-70"
        >
          {displayUrl ? (
            <img src={displayUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span>{initials(name)}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
            {busy ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <Camera size={16} className="text-white" />
            )}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={onChange}
          className="hidden"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm sm:text-base font-semibold text-[#111827] truncate">{name}</p>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{email}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0B47CF] hover:underline disabled:opacity-50"
          >
            <Camera size={11} /> {hasImage ? "Change photo" : "Upload photo"}
          </button>
          {hasImage && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              <Trash2 size={11} /> Remove
            </button>
          )}
          <span className="text-[10px] text-muted-foreground ml-1">
            JPG / PNG / WEBP · max 2 MB
          </span>
        </div>
      </div>
    </div>
  );
}
