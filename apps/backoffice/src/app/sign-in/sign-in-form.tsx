"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Label } from "@aim-ready/ui"
import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { checkCredentials, verifyCode } from "@/mock"
import { pathOf, LANDING } from "@/lib/access"
import { navigateHard } from "@/lib/navigation"

const credentialsSchema = z.object({ email: z.string(), password: z.string() })
const codeSchema = z.object({ code: z.string() })

/** Two-step staff sign-in: email and password, then the authenticator code. */
export function SignInForm() {
  const [step, setStep] = React.useState<{ pendingToken: string; email: string } | null>(null)
  const [error, setError] = React.useState("")
  const creds = useForm<z.infer<typeof credentialsSchema>>({ resolver: zodResolver(credentialsSchema), defaultValues: { email: "", password: "" } })
  const code = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } })

  const onCredentials = creds.handleSubmit(async (v) => {
    const r = await checkCredentials(v.email, v.password)
    if (!r.ok) return setError(r.error)
    setError("")
    code.reset({ code: "" })
    setStep({ pendingToken: r.pendingToken, email: v.email })
  })

  const onCode = code.handleSubmit(async (v) => {
    if (!step) return
    const r = await verifyCode(step.pendingToken, v.code)
    if (!r.ok) return setError(r.error)
    navigateHard(pathOf(LANDING[r.role]))
  })

  const errorNote = error ? (
    <div role="alert" className="mb-3.5 rounded-lg border border-danger-line bg-danger-bg px-3.5 py-3 text-sm font-semibold text-danger">
      {error}
    </div>
  ) : null

  if (step) {
    return (
      <form onSubmit={onCode} noValidate>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-g-50 px-3 py-2.5 text-sm">
          <span className="mono">{step.email}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStep(null)
              setError("")
              creds.setValue("password", "")
            }}
          >
            Change
          </Button>
        </div>
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="si-code">Authentication code</Label>
          <Input id="si-code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus aria-invalid={!!error || undefined} {...code.register("code")} />
          <span className="text-xs text-muted-foreground">Enter the six digits from your registered device.</span>
        </div>
        {errorNote}
        <Button type="submit" variant="primary" wide className="py-2.5">
          Verify and sign in
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={onCredentials} noValidate>
      <div className="mb-3 grid gap-[5px]">
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" autoComplete="username" aria-invalid={!!error || undefined} {...creds.register("email")} />
      </div>
      <div className="mb-3 grid gap-[5px]">
        <Label htmlFor="si-pw">Password</Label>
        <Input id="si-pw" type="password" autoComplete="current-password" aria-invalid={!!error || undefined} {...creds.register("password")} />
      </div>
      {errorNote}
      <Button type="submit" variant="primary" wide className="py-2.5">
        Continue
      </Button>
    </form>
  )
}
