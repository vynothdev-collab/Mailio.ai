"use client";

// Subscribes to live progress events for a single bulk job (listId).
// Emits the latest progress payload via state and signals a job-completion.

import { useEffect, useState } from "react";
import { getSocket } from "@/src/lib/socket";
import type { ListStatusChangeEvent, ProgressEvent } from "@/src/types/bulk";

export interface JobProgressState {
  progress:  ProgressEvent | null;
  status:    string | null;       // 'PROCESSING' | 'COMPLETED' | 'FAILED' | ...
}

export function useJobProgress(
  listId: string | null | undefined,
  onComplete?: () => void,
): JobProgressState {
  const [state, setState] = useState<JobProgressState>({
    progress: null,
    status:   null,
  });

  useEffect(() => {
    if (!listId) return;
    const socket = getSocket();

    // Tell the server we want events for this list's room.
    socket.emit("join-list", { listId });

    const onProgress = (payload: ProgressEvent) => {
      if (payload.listId !== listId) return;
      setState((prev) => ({ ...prev, progress: payload }));
    };

    const onStatusChange = (payload: ListStatusChangeEvent) => {
      if (payload.listId !== listId) return;
      setState((prev) => ({ ...prev, status: payload.status }));
      if (payload.status === "COMPLETED" || payload.status === "FAILED") {
        onComplete?.();
      }
    };

    socket.on("verification:progress", onProgress);
    socket.on("list:status-change", onStatusChange);

    return () => {
      socket.off("verification:progress", onProgress);
      socket.off("list:status-change", onStatusChange);
    };
  }, [listId, onComplete]);

  return state;
}
