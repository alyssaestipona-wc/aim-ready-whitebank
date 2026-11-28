import { AppStrip, AppStripLink } from "@aim-ready/ui"

import { ADMIN_URL, WEB_URL } from "@/lib/env"

/** The ink strip above every staff page, linking to the borrower web app and the admin console. */
export function StaffStrip() {
  return (
    <AppStrip name="Staff console" caption="separate from the borrower web app and the admin console" full>
      <AppStripLink href={ADMIN_URL}>Admin console</AppStripLink>
      <AppStripLink href={WEB_URL}>Borrower web app</AppStripLink>
    </AppStrip>
  )
}
