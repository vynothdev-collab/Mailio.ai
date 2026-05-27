"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import { adminActivityLogsService } from "@/services/admin.service";
import type { ActivityLog } from "@/types";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminActivityLogsService.getModules().then(setModules).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminActivityLogsService
      .findAll({ type: typeFilter, module: moduleFilter, page, limit: 20 })
      .then((res) => {
        setLogs(res.data);
        setTotal(res.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [typeFilter, moduleFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, moduleFilter]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Activity Logs</h1>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">All Types</option>
            <option value="SINGLE_USER">Single User</option>
            <option value="SYSTEM">System</option>
          </select>
          {modules.length > 0 && (
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="">All Modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Target ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-muted">Loading…</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-muted">No activity logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{log.action}</td>
                    <td className="px-4 py-3 text-text-secondary">{log.changedByAdminName}</td>
                    <td className="px-4 py-3 text-text-muted text-xs font-mono">
                      {log.targetId ? log.targetId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </Card>
    </div>
  );
}
