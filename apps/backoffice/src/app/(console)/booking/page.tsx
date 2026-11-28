import { Suspense } from "react"

import { BookingScreen } from "./booking-screen"

export default function BookingPage() {
  return (
    <Suspense>
      <BookingScreen />
    </Suspense>
  )
}
