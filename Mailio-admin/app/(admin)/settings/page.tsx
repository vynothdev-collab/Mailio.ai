"use client";

import { useState } from "react";
import { Settings as Cog, Mail, Shield, Puzzle, Bell, Palette } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import Toggle from "@/components/ui/Toggle";

const TABS = [
  { key: "single", label: "Single User Defaults" },
  { key: "enterprise", label: "Enterprise User Defaults" },
];

const SECTIONS = [
  { key: "general", label: "General", icon: Cog },
  { key: "email", label: "Email Settings", icon: Mail },
  { key: "security", label: "Security", icon: Shield },
  { key: "integrations", label: "Integrations", icon: Puzzle },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "appearance", label: "Appearance", icon: Palette },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("single");
  const [section, setSection] = useState("general");
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [emailVerification, setEmailVerification] = useState(true);

  return (
    <div>
      {/* Title rendered in global Header */}
      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card noPadding>
          <nav className="p-3">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-gray-50"}`}
                >
                  <Icon className="w-4 h-4" />{s.label}
                </button>
              );
            })}
          </nav>
        </Card>

        <Card className="p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-base font-bold text-text-primary mb-1">General Settings</h3>
          <p className="text-xs text-text-muted mb-5">Configure basic platform information and preferences.</p>

          <div className="space-y-4">
            <Field label="Platform Name"><input defaultValue="Mailio" className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg" /></Field>
            <Field label="Platform Email"><input defaultValue="support@mailio.ai" className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg" /></Field>
            <Field label="Default Timezone">
              <select className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg">
                <option>(UTC+05:30) Asia/Kolkata</option>
                <option>(UTC) Greenwich Mean Time</option>
              </select>
            </Field>
            <Field label="Date Format">
              <select className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg">
                <option>May 26, 2025 (DD MMM YYYY)</option>
                <option>2025-05-26 (YYYY-MM-DD)</option>
              </select>
            </Field>
            <Field label="Time Format">
              <select className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg">
                <option>10:30 AM</option><option>22:30</option>
              </select>
            </Field>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <Toggle label="Allow User Registration" description="Allow new users to register on the platform." checked={allowRegistration} onChange={setAllowRegistration} />
              <Toggle label="Email Verification Required" description="Require email verification for new user accounts." checked={emailVerification} onChange={setEmailVerification} />
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <Button variant="primary">Save Changes</Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-3 sm:p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">System Information</h3>
            <dl className="space-y-2 text-xs">
              <Row k="Platform Version" v="v2.4.1" />
              <Row k="Environment" v="Production" />
              <Row k="Last Updated" v="May 24, 2025 10:30 AM" />
              <Row k="Updated By" v="Admin User" />
            </dl>
          </Card>

          <Card className="p-3 sm:p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Storage Usage</h3>
            <div className="flex items-center justify-center mb-3">
              <div className="relative w-28 h-28 rounded-full" style={{ background: "conic-gradient(#2563eb 62%, #e5e7eb 62%)" }}>
                <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center">
                  <p className="text-xl font-bold text-text-primary">62%</p>
                  <p className="text-[9px] text-text-muted">Used</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-text-secondary text-center"><strong>12.4 GB</strong> of 20 GB Total</p>
            <button className="w-full mt-2 text-xs text-primary-600 font-medium hover:underline">View Storage Details</button>
          </Card>

          <Card className="p-3 sm:p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Activity Summary (Last 7 Days)</h3>
            <dl className="space-y-2 text-xs">
              <Row k="New Users" v={<span>312 <span className="text-emerald-600 font-medium">↑ 18.6%</span></span>} />
              <Row k="Active Users" v={<span>4,892 <span className="text-emerald-600 font-medium">↑ 8.7%</span></span>} />
              <Row k="Emails Processed" v={<span>125,430 <span className="text-emerald-600 font-medium">↑ 14.8%</span></span>} />
              <Row k="Credits Used" v={<span>1.23M <span className="text-emerald-600 font-medium">↑ 6.3%</span></span>} />
            </dl>
            <button className="w-full mt-3 text-xs text-primary-600 font-medium hover:underline">View Full Report</button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
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
