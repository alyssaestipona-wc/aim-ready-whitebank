import { Suspense } from "react"

import { DeniedNotice } from "./denied-notice"

export default function DeniedPage() {
  return (
    <Suspense>
      <DeniedNotice />
    </Suspense>
  )
}
