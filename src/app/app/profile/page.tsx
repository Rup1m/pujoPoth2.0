import { redirect } from "next/navigation";

/**
 * /app/profile route — redirects to the main app.
 * Profile is accessed via the bottom sheet on the map view,
 * not a standalone page. This route exists as a fallback.
 */
export default function ProfilePage() {
  redirect("/app");
}
