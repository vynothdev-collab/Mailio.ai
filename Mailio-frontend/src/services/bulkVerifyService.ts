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

  async getAggregateBreakdown(signal?: AbortSignal): Promise<BulkBreakdownDto> {
    const { data } = await api.get<BulkBreakdownDto>("/verify/bulk/breakdown", { signal });
    return data;
  },

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

  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/verify/bulk/${jobId}`);
  },

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

void BASE_URL;
