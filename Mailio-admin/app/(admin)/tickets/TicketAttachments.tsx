"use client";

import { useState } from "react";
import { Download, Film, Paperclip, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { adminTicketsService, type TicketAttachment } from "@/services/tickets.service";

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface Props {
  ticketId: string;
  attachments: TicketAttachment[];
  /** Re-fetch the ticket detail — used to refresh expired signed URLs and after deletion. */
  onReload: () => void | Promise<void>;
}

export function TicketAttachments({ ticketId, attachments, onReload }: Props) {
  const [lightbox, setLightbox] = useState<TicketAttachment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(att: TicketAttachment) {
    if (busyId) return;
    if (!window.confirm(`Delete "${att.originalName}"? This cannot be undone.`)) return;
    setBusyId(att.id);
    try {
      await adminTicketsService.removeAttachment(ticketId, att.id);
      toast.success("Attachment removed.");
      await onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove attachment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="px-4 sm:px-6 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="w-3.5 h-3.5 text-text-muted" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Attachments {attachments.length > 0 && `· ${attachments.length}`}
        </p>
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-text-muted">No attachments.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-gray-200 bg-white overflow-hidden flex flex-col"
            >
              <div className="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden">
                {a.fileType === "image" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={a.viewUrl}
                    alt={a.originalName}
                    onClick={() => setLightbox(a)}
                    onError={() => void onReload()}
                    className="object-cover w-full h-full cursor-zoom-in"
                  />
                ) : (
                  <video
                    src={a.viewUrl}
                    controls
                    onError={() => void onReload()}
                    className="w-full h-full"
                  />
                )}
              </div>
              <div className="px-2 py-1.5 flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-text-primary truncate" title={a.originalName}>
                    {a.fileType === "video" && (
                      <Film className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                    )}
                    {a.originalName}
                  </p>
                  <p className="text-[10px] text-text-muted">{fmtSize(a.sizeBytes)}</p>
                </div>
                <a
                  href={a.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download attachment"
                  className="inline-flex items-center justify-center h-6 w-6 rounded text-primary-600 hover:bg-primary-50/60"
                >
                  <Download className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  disabled={busyId === a.id}
                  aria-label="Delete attachment"
                  className="inline-flex items-center justify-center h-6 w-6 rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Close"
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="w-4 h-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.viewUrl}
            alt={lightbox.originalName}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />
        </div>
      )}
    </section>
  );
}
