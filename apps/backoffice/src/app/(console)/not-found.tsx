import { PageHeader } from "@aim-ready/ui"

import { GoToMyWork } from "@/components/go-to-my-work"

/** notFound() from inside the console (e.g. an unknown case ID). */
export default function ConsoleNotFound() {
  return <PageHeader title="Not found" description="That page or record doesn’t exist." actions={<GoToMyWork />} />
}
