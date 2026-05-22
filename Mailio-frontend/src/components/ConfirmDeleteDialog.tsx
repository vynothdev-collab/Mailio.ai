"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDeleteDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  title?:       string;
  description?: string;
  itemLabel?:   string;
  pending?:     boolean;
  onConfirm:    () => void;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  itemLabel,
  pending = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const isBulk = title?.toLowerCase().includes("bulk");

  const resolvedTitle = title ?? (isBulk ? "Delete bulk job?" : "Delete verification?");

  const resolvedDescription = description ?? (
    <>
      You are about to permanently delete{" "}
      {itemLabel ? (
        <span className="font-semibold text-foreground break-all">{itemLabel}</span>
      ) : (
        "this record"
      )}
      {isBulk
        ? ". All associated verification results will be lost."
        : "."}
      {" "}This action <span className="font-semibold text-foreground">cannot be undone</span>.
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
              <Trash2 size={16} className="text-red-600" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle className="text-sm font-semibold text-foreground sm:text-base">
                {resolvedTitle}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed sm:text-sm">
                {resolvedDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="h-9 text-sm sm:h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending}
            className="h-9 gap-1.5 bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-70 sm:h-10"
          >
            {pending ? (
              <><Loader2 size={14} className="animate-spin" /> Deleting…</>
            ) : (
              <><Trash2 size={14} /> Delete</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
