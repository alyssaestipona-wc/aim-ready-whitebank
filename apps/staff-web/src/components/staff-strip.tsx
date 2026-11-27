import { AppStrip, AppStripLink } from "@aim-ready/ui"

import { BORROWER_WEB_URL } from "@/lib/env"

/** The ink strip above every staff page, linking to the borrower web app. */
export function StaffStrip() {
  return (
    <AppStrip name="Staff console" caption="separate from the borrower web app" full>
      <AppStripLink href={BORROWER_WEB_URL}>Borrower web app</AppStripLink>
    </AppStrip>
  )
}
