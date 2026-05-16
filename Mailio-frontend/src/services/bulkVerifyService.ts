// Bulk verification service — wraps /verify/bulk/* endpoints.
// File uploads use multipart/form-data; everything else is JSON.

import { api } from "./api";
import { downloadFile } from "@/src/lib/download";
import type {
  BulkActiveJobDto,
  BulkBreakdownDto,
  BulkJobsResponse,
  BulkProgressDto,
  BulkStatsDto,
  BulkUploadResponse,
} from "@/src/types/bulk";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const bulkVerifyService = {
  /** POST /verify/bulk/upload — multipart file upload. */
  async upload(
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<BulkUploadResponse> {
    const form = new FormData();
    form.append("file", file);

    const { data } = await api.post<BulkUploadResponse>(
      "/verify/bulk/upload",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      },
    );
    return data;
  },

  async getActive(signal?: AbortSignal): Promise<BulkActiveJobDto | null> {
    const { data } = await api.get<BulkActiveJobDto | null>("/verify/bulk/active", { signal });
    return data;
  },

  async getJobs(
    page = 1,
    limit = 10,
    status?: string,
    signal?: AbortSignal,
  ): Promise<BulkJobsResponse> {
    const { data } = await api.get<BulkJobsResponse>("/verify/bulk/jobs", {
      params: { page, limit, status },
      signal,
    });
    return data;
  },

  async getStats(signal?: AbortSignal): Promise<BulkStatsDto> {
    const { data } = await api.get<BulkStatsDto>("/verify/bulk/stats", { signal });
    return data;
  },

  async getProgress(jobId: string, signal?: AbortSignal): Promise<BulkProgressDto> {
    const { data } = await api.get<BulkProgressDto>(`/verify/bulk/${jobId}/progress`, { signal });
    return data;
  },

  async getBreakdown(jobId: string, signal?: AbortSignal): Promise<BulkBreakdownDto> {
    const { data } = await api.get<BulkBreakdownDto>(`/verify/bulk/${jobId}/breakdown`, { signal });
    return data;
  },

  /** Aggregate Valid + Invalid counts across ALL bulk verifications for the user. */
  async getAggregateBreakdown(signal?: AbortSignal): Promise<BulkBreakdownDto> {
    const { data } = await api.get<BulkBreakdownDto>("/verify/bulk/breakdown", { signal });
    return data;
  },

  /**
   * Fetch the per-row results for a job as JSON — same payload the JSON
   * download writes to disk, but returned in-memory for previewing in a modal.
   */
  async getResultRows(
    jobId: string,
    signal?: AbortSignal,
  ): Promise<{ email: string; user: string; domain: string; status: string }[]> {
    const { data } = await api.get<
      { email: string; user: string; domain: string; status: string }[]
    >(`/verify/bulk/${jobId}/download`, {
      params: { format: "json", type: "full" },
      signal,
    });
    return data;
  },

  async retry(jobId: string): Promise<{ requeuedCount: number }> {
    const { data } = await api.post<{ requeuedCount: number }>(`/verify/bulk/${jobId}/retry`);
    return data;
  },

  /**
   * Trigger an authenticated download of the bulk job results.
   * If `fallbackName` (typically the original uploaded filename) is provided,
   * it's used when the server doesn't expose Content-Disposition.
   */
  async download(
    jobId: string,
    format: "csv" | "json" = "csv",
    type: "verified" | "full" = "full",
    fallbackName?: string,
  ): Promise<void> {
    const stripped = fallbackName?.replace(/\.[^.]+$/, "") ?? `bulk-${jobId}`;
    await downloadFile(
      `/verify/bulk/${jobId}/download?format=${format}&type=${type}`,
      `${stripped}.${format}`,
    );
  },
};

// Suppress "BASE_URL declared but not used" — kept for parity with other services.
void BASE_URL;
