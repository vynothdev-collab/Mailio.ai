"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Archive, FileText, CheckCheck, ClipboardList,
  Loader2, X, ToggleLeft, ToggleRight, Pencil, Star,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import {
  plansService,
  type BillingPlan,
  type CreatePlanPayload,
  type UpdatePlanPayload,
} from "@/services/plans.service";

const TABS = [
  { key: "USER",       label: "Normal User Plans" },
  { key: "ENTERPRISE", label: "Enterprise Plans"  },
];

export default function PlansPage() {
  const [tab,          setTab]          = useState<"USER" | "ENTERPRISE">("USER");
  const [plans,        setPlans]        = useState<BillingPlan[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<BillingPlan | null>(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<BillingPlan | null>(null);
  const [settingPop,   setSettingPop]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await plansService.list();
      setPlans(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tabPlans  = plans.filter((p) => p.planType === tab);
  const filtered  = tabPlans.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active"   && !p.isActive) return false;
    if (statusFilter === "inactive" &&  p.isActive) return false;
    return true;
  });
  const activePlans = tabPlans.filter((p) => p.isActive);

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

  async function handleSetPopular(plan: BillingPlan) {
    if (plan.isPopular) return; // already popular
    setSettingPop(plan.id);
    try {
      await plansService.setPopular(plan.id);
      await load();
    } finally {
      setSettingPop(null);
    }
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

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          label={tab === "USER" ? "Normal User Plans" : "Enterprise Plans"}
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
          sub={`${tabPlans.length ? Math.round((activePlans.length / tabPlans.length) * 100) : 0}% active`}
        />
        <StatCard
          label="Inactive Plans"
          value={String(tabPlans.length - activePlans.length)}
          icon={FileText}
          accent="orange"
          sub="Hidden from users"
        />
      </div>

      {/* Popular plan info banner */}
      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 flex items-center gap-2 text-xs text-blue-700">
        <Star className="w-3.5 h-3.5 shrink-0" />
        The plan marked as popular will display the &quot;Most Popular&quot; badge on the user billing page. Only one plan can be popular per type at a time.
      </div>

      <Card noPadding className="mb-6">
        <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search plans by name…"
            className="flex-1 max-w-md"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            options={[
              { value: "active",   label: "Active"   },
              { value: "inactive", label: "Inactive" },
            ]}
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
              No {tab === "USER" ? "normal user" : "enterprise"} plans found.
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  {["Plan Name", "Price", "Credits", "Validity", "Status", "Set as Popular", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
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
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">
                      <span className="flex items-center gap-1.5">
                        {p.name}
                        {p.isPopular && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Star className="w-2.5 h-2.5" />Popular
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-text-primary">
                      {p.currency}{p.price.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
                      {p.credits.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">
                      {p.validityDays} days
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <StatusBadge
                        label={p.isActive ? "Active" : "Inactive"}
                        tone={p.isActive ? "green" : "red"}
                      />
                    </td>
                    {/* Set as Popular radio */}
                    <td className="px-3 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSetPopular(p)}
                          disabled={p.isPopular || settingPop === p.id}
                          title={p.isPopular ? "Currently Popular" : "Set as Popular"}
                          className="flex items-center gap-1.5 text-xs disabled:cursor-default"
                        >
                          {settingPop === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                          ) : (
                            <span
                              className={`inline-block w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                                p.isPopular
                                  ? "border-primary-600 bg-primary-600"
                                  : "border-gray-300 bg-white hover:border-primary-400"
                              }`}
                            />
                          )}
                          <span className={p.isPopular ? "text-primary-600 font-semibold" : "text-text-muted"}>
                            {p.isPopular ? "Currently Popular" : "Set as Popular"}
                          </span>
                        </button>
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-3 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit plan"
                          onClick={() => setEditTarget(p)}
                          className="p-1.5 rounded hover:bg-gray-100"
                        >
                          <Pencil className="w-3.5 h-3.5 text-text-muted" />
                        </button>
                        <button
                          title={p.isActive ? "Deactivate" : "Activate"}
                          onClick={() => handleToggle(p.id)}
                          className="p-1.5 rounded hover:bg-gray-100"
                        >
                          {p.isActive
                            ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                            : <ToggleLeft  className="w-4 h-4 text-text-muted"  />}
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

      {/* Plan detail panel */}
      {selected && (
        <Card className="p-3 sm:p-5">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-text-primary">{selected.name}</h3>
                  <StatusBadge
                    label={selected.isActive ? "Active" : "Inactive"}
                    tone={selected.isActive ? "green" : "red"}
                  />
                  {selected.isPopular && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <Star className="w-3 h-3" />Most Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {selected.planType === "USER" ? "Normal User" : "Enterprise"} Plan
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditTarget(selected)}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="text-xs font-semibold text-text-primary mb-3">Plan Details</h4>
              <dl className="space-y-2 text-sm">
                <Row k="Price"      v={`${selected.currency}${selected.price.toLocaleString()}`} />
                <Row k="Credits"    v={selected.credits.toLocaleString()} />
                <Row k="Validity"   v={`${selected.validityDays} days`} />
                <Row k="Sort Order" v={String(selected.sortOrder)} />
                <Row k="Type"       v={selected.planType === "USER" ? "Normal User" : "Enterprise"} />
                <Row k="Plan ID"    v={<span className="text-xs font-mono">{selected.id}</span>} />
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
        <PlanFormModal
          planType={tab}
          onClose={() => setShowCreate(false)}
          onSaved={async () => { setShowCreate(false); await load(); }}
        />
      )}

      {editTarget && (
        <PlanFormModal
          planType={editTarget.planType}
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={async (updated) => {
            setEditTarget(null);
            setSelected((s) => (s?.id === updated.id ? updated : s));
            await load();
          }}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      {children}
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

function PlanFormModal({
  planType,
  initial,
  onClose,
  onSaved,
}: {
  planType: "USER" | "ENTERPRISE";
  initial?: BillingPlan;
  onClose: () => void;
  onSaved: (plan: BillingPlan) => Promise<void>;
}) {
  const isEdit = !!initial;

  type FormState = CreatePlanPayload & { isPopular: boolean; sortOrder: number };

  const [form, setForm] = useState<FormState>({
    name:        initial?.name        ?? "",
    planType,
    price:       initial?.price       ?? 0,
    currency:    initial?.currency    ?? "INR",
    credits:     initial?.credits     ?? 1000,
    validityDays:initial?.validityDays ?? 30,
    features:    initial?.features    ?? [],
    isActive:    initial?.isActive    ?? true,
    isPopular:   initial?.isPopular   ?? false,
    sortOrder:   initial?.sortOrder   ?? 0,
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function handleNum(field: "price" | "credits" | "validityDays", raw: string) {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    setForm((p) => ({ ...p, [field]: isNaN(n) ? 0 : n }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())           { setError("Plan name is required.");         return; }
    if ((form.credits ?? 0) < 1)     { setError("Credits must be at least 1.");    return; }
    if ((form.validityDays ?? 0) < 1){ setError("Validity must be at least 1 day."); return; }
    setSaving(true);
    setError("");
    try {
      let saved: BillingPlan;
      if (isEdit && initial) {
        const payload: UpdatePlanPayload = { ...form };
        saved = await plansService.update(initial.id, payload);
      } else {
        saved = await plansService.create(form);
      }
      await onSaved(saved);
    } catch {
      setError(`Failed to ${isEdit ? "update" : "create"} plan. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = planType === "USER" ? "Normal User" : "Enterprise";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {isEdit ? "Edit" : "Create"} {typeLabel} Plan
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Type: <span className="font-medium text-primary-600">{typeLabel}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Plan Name">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={planType === "USER" ? "e.g. Pro Plan" : "e.g. Enterprise Basic"}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                  {form.currency}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.price === 0 ? "" : String(form.price)}
                  onChange={(e) => handleNum("price", e.target.value)}
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
                onChange={(e) => handleNum("credits", e.target.value)}
                placeholder="e.g. 10000"
              />
            </Field>
            <Field label="Validity (days)">
              <input
                type="text"
                inputMode="numeric"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.validityDays === 0 ? "" : String(form.validityDays)}
                onChange={(e) => handleNum("validityDays", e.target.value)}
                placeholder="e.g. 30"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm text-text-secondary">
                Active (visible to users)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPopular"
                checked={form.isPopular}
                onChange={(e) => setForm((p) => ({ ...p, isPopular: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="isPopular" className="text-sm text-text-secondary">
                Mark as Most Popular <span className="text-amber-600">(replaces existing popular plan)</span>
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" disabled={saving}>
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                : isEdit ? "Save Changes" : `Create ${typeLabel} Plan`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
