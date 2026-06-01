"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Archive,
  FileText,
  CheckCheck,
  ClipboardList,
  Loader2,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import { plansService, type BillingPlan, type CreatePlanPayload } from "@/services/plans.service";

const TABS = [
  { key: "USER", label: "Single User Plans" },
  { key: "ENTERPRISE", label: "Enterprise Plans" },
];

export default function PlansPage() {
  const [tab, setTab] = useState<"USER" | "ENTERPRISE">("USER");
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BillingPlan | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await plansService.list();
      setPlans(data);
    } catch {
      // silently fail — table shows empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tabPlans  = plans.filter((p) => p.planType === tab);
  const filtered  = tabPlans.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active" && !p.isActive) return false;
    if (statusFilter === "inactive" && p.isActive) return false;
    return true;
  });

  const activePlans = tabPlans.filter((p) => p.isActive);

  // Auto-clear selected when switching tabs
  const handleTabChange = (t: string) => {
    setTab(t as "USER" | "ENTERPRISE");
    setSelected(null);
  };

  async function handleDelete(id: string) {
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    await plansService.delete(id);
    if (selected?.id === id) setSelected(null);
    await load();
  }

  async function handleToggle(id: string) {
    await plansService.toggle(id);
    await load();
  }

  return (
    <div>
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={handleTabChange}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Create Plan
          </Button>
        }
        className="mb-6"
      />

      {/* Tab-specific stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          label={tab === "USER" ? "Single User Plans" : "Enterprise Plans"}
          value={String(tabPlans.length)}
          icon={ClipboardList}
          accent="purple"
          sub={tab === "USER" ? "Individual plans" : "Enterprise plans"}
        />
        <StatCard
          label="Active Plans"
          value={String(activePlans.length)}
          icon={CheckCheck}
          accent="green"
          sub={`${tabPlans.length ? Math.round((activePlans.length / tabPlans.length) * 100) : 0}% of ${tab === "USER" ? "user" : "enterprise"} plans`}
        />
        <StatCard
          label="Inactive Plans"
          value={String(tabPlans.length - activePlans.length)}
          icon={FileText}
          accent="orange"
          sub="Deactivated / hidden from users"
        />
      </div>

      <Card noPadding className="mb-6">
        <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search plans by name..." className="flex-1 max-w-md" />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
            className="w-32"
          />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-muted gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />Loading plans…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">
              No {tab === "USER" ? "single user" : "enterprise"} plans found.
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {["Plan Name", "Price", "Credits", "Validity", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer ${p.id === selected?.id ? "bg-primary-50/40" : ""}`}
                  >
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">{p.name}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">{p.currency}{p.price.toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{p.credits.toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{p.validityDays} Days</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <StatusBadge label={p.isActive ? "Active" : "Inactive"} tone={p.isActive ? "green" : "red"} />
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          title={p.isActive ? "Deactivate" : "Activate"}
                          onClick={() => handleToggle(p.id)}
                          className="p-1.5 rounded hover:bg-gray-100"
                        >
                          {p.isActive
                            ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                            : <ToggleLeft className="w-4 h-4 text-text-muted" />}
                        </button>
                        <button
                          title="Delete plan"
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded hover:bg-gray-100"
                        >
                          <Archive className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {selected && (
        <Card className="p-3 sm:p-5">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-primary">{selected.name}</h3>
                  <StatusBadge label={selected.isActive ? "Active" : "Inactive"} tone={selected.isActive ? "green" : "red"} />
                </div>
                <p className="text-xs text-text-muted mt-0.5">{selected.planType === "USER" ? "Single User" : "Enterprise"} Plan</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="text-xs font-semibold text-text-primary mb-3">Plan Details</h4>
              <dl className="space-y-2 text-sm">
                <Row k="Price" v={`${selected.currency}${selected.price.toLocaleString()}`} />
                <Row k="Credits" v={selected.credits.toLocaleString()} />
                <Row k="Validity" v={`${selected.validityDays} Days`} />
                <Row k="Type" v={selected.planType === "USER" ? "Single User" : "Enterprise"} />
                <Row k="Plan ID" v={<span className="text-xs font-mono">{selected.id}</span>} />
              </dl>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-text-primary mb-3">Plan Features</h4>
              {selected.features?.length ? (
                <ul className="space-y-2 text-sm">
                  {selected.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-text-secondary">
                      <CheckCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-text-muted">No features listed.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {showCreate && (
        <CreatePlanModal
          planType={tab}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-muted">{k}</dt>
      <dd className="font-semibold text-text-primary">{v}</dd>
    </div>
  );
}

function CreatePlanModal({
  planType,
  onClose,
  onCreated,
}: {
  planType: "USER" | "ENTERPRISE";
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [form, setForm] = useState<CreatePlanPayload>({
    name: "",
    planType,
    price: 0,
    currency: "INR",
    credits: 1000,
    validityDays: 30,
    features: [],
    isActive: true,
  });
  const [featInput, setFeatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addFeature() {
    const f = featInput.trim();
    if (!f) return;
    setForm((prev) => ({ ...prev, features: [...(prev.features ?? []), f] }));
    setFeatInput("");
  }

  function removeFeature(i: number) {
    setForm((prev) => ({ ...prev, features: prev.features?.filter((_, idx) => idx !== i) }));
  }

  function handleNumberInput(field: "price" | "credits" | "validityDays", raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    setForm((p) => ({ ...p, [field]: isNaN(num) ? 0 : num }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Plan name is required."); return; }
    if ((form.credits ?? 0) < 1) { setError("Credits must be at least 1."); return; }
    if ((form.validityDays ?? 0) < 1) { setError("Validity must be at least 1 day."); return; }
    setSaving(true);
    setError("");
    try {
      await plansService.create(form);
      await onCreated();
    } catch {
      setError("Failed to create plan. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = planType === "USER" ? "Single User" : "Enterprise";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Create {typeLabel} Plan</h2>
            <p className="text-xs text-text-muted mt-0.5">Type: <span className="font-medium text-primary-600">{typeLabel}</span></p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Plan Name">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={`e.g. ${planType === "USER" ? "Pro Plan" : "Enterprise Basic"}`}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{form.currency}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.price === 0 ? "" : String(form.price)}
                  onChange={(e) => handleNumberInput("price", e.target.value)}
                  placeholder="0"
                />
              </div>
            </Field>
            <Field label="Currency">
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                placeholder="INR"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Credits">
              <input
                type="text"
                inputMode="numeric"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.credits === 0 ? "" : String(form.credits)}
                onChange={(e) => handleNumberInput("credits", e.target.value)}
                placeholder="e.g. 10000"
              />
            </Field>
            <Field label="Validity (days)">
              <input
                type="text"
                inputMode="numeric"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.validityDays === 0 ? "" : String(form.validityDays)}
                onChange={(e) => handleNumberInput("validityDays", e.target.value)}
                placeholder="e.g. 30"
              />
            </Field>
          </div>

          <Field label="Features">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={featInput}
                  onChange={(e) => setFeatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                  placeholder="Add feature and press Enter"
                />
                <button type="button" onClick={addFeature} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Add</button>
              </div>
              {(form.features ?? []).map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-text-secondary">{f}</span>
                  <button type="button" onClick={() => removeFeature(i)}><X className="w-3.5 h-3.5 text-text-muted" /></button>
                </div>
              ))}
            </div>
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-text-secondary">Active (visible to users)</label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Create ${typeLabel} Plan`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      {children}
    </div>
  );
}
