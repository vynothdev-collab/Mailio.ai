"use client";

import { Loader2 } from "lucide-react";
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
  open:        boolean;
  onOpenChange:(open: boolean) => void;
  title?:      string;
  description?:string;
  itemLabel?:  string;
  pending?:    boolean;
  onConfirm:   () => void;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Delete record?",
  description,
  itemLabel,
  pending = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? (
              <>
                This will move{" "}
                {itemLabel ? (
                  <span className="font-medium text-foreground">{itemLabel}</span>
                ) : (
                  "this record"
                )}{" "}
                to your deleted items. This action can&apos;t be undone from the UI.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending}
            className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-70"
          >
            {pending ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" /> Deleting…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
