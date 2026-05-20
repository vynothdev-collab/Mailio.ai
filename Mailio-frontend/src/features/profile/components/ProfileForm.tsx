"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_USER_PROFILE } from "../mock";

export function ProfileForm() {
  const [form, setForm] = useState(MOCK_USER_PROFILE);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = form.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleSave() {
    toast.success("Profile updated successfully.");
  }

  return (
    <Card>
      <CardContent className="pt-3 space-y-5">
        <h2 className="text-sm font-semibold">Profile</h2>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-brand text-white text-lg font-bold select-none">
              {initials}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border shadow-sm hover:bg-muted transition-colors"
              aria-label="Upload photo"
            >
              <Camera size={11} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" />
          </div>
          <div>
            <p className="text-sm font-semibold">{form.fullName}</p>
            <p className="text-xs text-muted-foreground">{form.email}</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-primary hover:underline mt-0.5"
            >
              Change photo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Full Name",  key: "fullName" as const,  placeholder: "Your full name"  },
            { label: "Email",      key: "email"    as const,  placeholder: "you@company.com" },
            { label: "Job Title",  key: "jobTitle" as const,  placeholder: "e.g. Head of Growth" },
            { label: "Company",    key: "company"  as const,  placeholder: "Your company"    },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
              <Input
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="h-9 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            onClick={handleSave}
            className="gradient-brand border-0 text-white hover:opacity-90 text-sm"
          >
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
