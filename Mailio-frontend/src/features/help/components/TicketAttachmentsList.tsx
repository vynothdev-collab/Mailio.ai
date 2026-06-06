"use client";

import { useState } from "react";
import { Download, Film, Paperclip, X } from "lucide-react";
import type { TicketAttachment } from "@/src/services/ticketsService";
import { formatFileSize as fmtSize } from "./ticket-attachments-utils";

interface Props {
  attachments: TicketAttachment[];

  onRefresh?: () => void;
}

export function TicketAttachmentsList({ attachments, onRefresh }: Props) {
  const [lightbox, setLightbox] = useState<TicketAttachment | null>(null);

  return (
    <section className="px-4 sm:px-6 py-4 border-b border-[#DCE6F3]/70">
      <div className="flex items-center gap-2 mb-2">
        <Paperclip size={12} className="text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Attachments {attachments.length > 0 && `· ${attachments.length}`}
        </p>
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No attachments.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-[#DCE6F3] bg-white overflow-hidden flex flex-col"
            >
              <div className="aspect-video bg-[#F4F8FF] flex items-center justify-center overflow-hidden">
                {a.fileType === "image" ? (
                  <img
                    src={a.viewUrl}
                    alt={a.originalName}
                    onClick={() => setLightbox(a)}
                    onError={() => onRefresh?.()}
                    className="object-cover w-full h-full cursor-zoom-in"
                  />
                ) : (
                  <video
                    src={a.viewUrl}
                    controls
                    onError={() => onRefresh?.()}
                    className="w-full h-full"
                  />
                )}
              </div>
              <div className="px-2 py-1.5 flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate" title={a.originalName}>
                    {a.fileType === "video" && <Film size={10} className="inline mr-0.5 -mt-0.5" />}
                    {a.originalName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{fmtSize(a.sizeBytes)}</p>
                </div>
                <a
                  href={a.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download attachment"
                  className="inline-flex items-center justify-center h-6 w-6 rounded text-[#0B47CF] hover:bg-[#F4F8FF]"
                >
                  <Download size={12} />
                </a>
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
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            aria-label="Close"
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X size={16} />
          </button>
          {}
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
