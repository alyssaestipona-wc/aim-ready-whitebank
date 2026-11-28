import { PageHeader } from "@aim-ready/ui"

import { ConsoleShell } from "@/components/console-shell"
import { GoToMyWork } from "@/components/go-to-my-work"

export default function NotFound() {
  return (
    <ConsoleShell>
      <PageHeader title="Not found" description="That page or record doesn’t exist." actions={<GoToMyWork />} />
    </ConsoleShell>
  )
}
