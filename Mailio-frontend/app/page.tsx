"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS, getItem } from "@/src/utils/storage";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const hasToken = !!getItem(STORAGE_KEYS.accessToken);
    router.replace(hasToken ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
