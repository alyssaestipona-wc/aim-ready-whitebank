"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Label } from "@aim-ready/ui"

import { ErrorNote } from "@/components/portal"
import { navigateHard } from "@/lib/navigation"
import { actions } from "@/mock"
import { signInSchema, type SignInValues } from "@/mock/schemas"

export default function SignInPage() {
  const [error, setError] = React.useState("")
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } })

  const onSubmit = form.handleSubmit(async (v) => {
    const r = await actions.signIn(v.email, v.password)
    if (!r.ok) {
      setError(r.error)
      return
    }
    setError("")
    form.reset()
    navigateHard("/")
  })

  return (
    <div className="mx-auto mt-5 max-w-[420px] sm:mt-12 sm:rounded-3xl sm:border sm:border-border sm:bg-paper sm:p-7">
      <h2 className="text-2xl tracking-[-0.03em]">Welcome back</h2>
      <p className="mt-1 mb-[22px] text-[13.5px] text-muted-foreground">Sign in to Kalinaw Bank online.</p>
      <form noValidate onSubmit={onSubmit} onChange={() => error && setError("")}>
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="bw-email">Email</Label>
          <Input id="bw-email" type="email" autoComplete="username" aria-invalid={!!error || undefined} {...form.register("email")} />
        </div>
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="bw-pin">Password</Label>
          <Input id="bw-pin" type="password" autoComplete="current-password" aria-invalid={!!error || undefined} {...form.register("password")} />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" variant="primary" wide size="lg">
          Sign in
        </Button>
      </form>
    </div>
  )
}
