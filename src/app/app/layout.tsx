import type { ReactNode } from "react";
import { InstallPrompt } from "@/components/install-prompt";

/**
 * Layout for the /app route.
 * Includes the install prompt UI which shows on all app pages.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <InstallPrompt />
    </>
  );
}
