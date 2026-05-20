"use client";

import { createContext, useContext } from "react";

export interface MobileMenuContextValue {
  openMobile: () => void;
  registerHeader: () => () => void;
  hasHeader: boolean;
}

export const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function useMobileMenu() {
  return useContext(MobileMenuContext);
}
