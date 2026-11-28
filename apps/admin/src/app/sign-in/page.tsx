import { AdminStrip } from "@/components/admin-strip"
import { Brand } from "@/components/brand"

import { SignInForm } from "./sign-in-form"

export default function SignInPage() {
  return (
    <>
      <AdminStrip />
      <div className="grid min-h-[calc(100vh-38px)] grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section className="flex flex-col justify-between gap-[22px] bg-ink px-5 py-7 text-white md:gap-10 md:px-12 md:py-11">
          <Brand />
          <h2 className="max-w-[15ch] text-[22px] leading-[1.15] font-semibold tracking-[-0.03em] text-white md:text-[30px]">
            Tenant configuration, kept out of everyone else’s way.
          </h2>
          <span />
        </section>
        <section className="flex items-center justify-center bg-paper px-6 py-10">
          <div className="w-full max-w-[380px]">
            <h1 className="mb-6 text-2xl tracking-[-0.025em]">Sign in</h1>
            <SignInForm />
          </div>
        </section>
      </div>
    </>
  )
}
