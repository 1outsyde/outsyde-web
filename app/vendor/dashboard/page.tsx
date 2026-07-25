// app/vendor/dashboard/page.tsx
// Catch-all for Stripe's post-checkout success redirect.
//
// The backend's Stripe checkout endpoint hardcodes
//   success_url = "${FRONTEND_URL}/vendor/dashboard?subscription=..."
// This page exists solely to receive that redirect and send the vendor
// to /subscription/manage, where their updated plan is shown.

import { redirect } from "next/navigation";

export default function VendorDashboard() {
  redirect("/subscription/success");
}
