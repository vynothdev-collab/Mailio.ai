"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/src/lib/socket";
import type { ListStatusChangeEvent, ProgressEvent } from "@/src/types/bulk";

interface JobProgressState {
  progress:  ProgressEvent | null;
  status:    string | null;
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
