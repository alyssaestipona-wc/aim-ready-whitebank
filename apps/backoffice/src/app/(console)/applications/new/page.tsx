import { Suspense } from "react"

import { AssistedApplication } from "./assisted-application"

export default function NewApplicationPage() {
  return (
    <Suspense>
      <AssistedApplication />
    </Suspense>
  )
}
