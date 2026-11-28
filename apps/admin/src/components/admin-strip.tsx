import { AppStrip, AppStripLink } from "@aim-ready/ui"

import { BACKOFFICE_URL, WEB_URL } from "@/lib/env"

/** The ink strip above every admin page, linking to the other two apps. */
export function AdminStrip() {
  return (
    <AppStrip name="Admin console" caption="separate from the staff console and the borrower web app" full>
      <AppStripLink href={BACKOFFICE_URL}>Staff console</AppStripLink>
      <AppStripLink href={WEB_URL}>Borrower web app</AppStripLink>
    </AppStrip>
  )
}
