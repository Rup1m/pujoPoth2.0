import type { ReactNode } from "react";
/**
 * Layout for the /app route.
 * Includes the install prompt UI which shows on all app pages.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
