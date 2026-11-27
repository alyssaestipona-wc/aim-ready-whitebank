"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, EmptyState, Label, NativeSelect, NativeSelectOption, useToast } from "@aim-ready/ui"

import { ErrorNote, Note, PageSkeleton, PageTitle, usePortal } from "@/components/portal"
import { actions, UPLOAD_LIMIT_MB } from "@/mock"
import { uploadSchema, type UploadValues } from "@/mock/schemas"

export default function UploadPage() {
  const portal = usePortal()
  const router = useRouter()
  const toast = useToast()
  const [error, setError] = React.useState("")
  const form = useForm<UploadValues>({ resolver: zodResolver(uploadSchema), defaultValues: { file: "" } })
  if (!portal) return <PageSkeleton />
  const a = portal.app
  if (!a || a.stage !== "Info requested") {
    return (
      <div>
        <PageTitle title="Upload documents" back="/" />
        <EmptyState title="Nothing to upload" hint="We don’t need anything from you right now." />
      </div>
    )
  }

  const onSubmit = form.handleSubmit(async (v) => {
    const r = await actions.uploadDocuments(v.file)
    if (!r.ok) return setError(r.error)
    form.reset()
    setError("")
    router.push("/")
    toast("Documents received. Virus scan passed.")
  })

  return (
    <div>
      <PageTitle title="Upload documents" back="/" />
      <Note>
        <b>From WhiteBank:</b> {a.infoMsg || "Please upload the requested documents."}
      </Note>
      <form noValidate onSubmit={onSubmit}>
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="up-file">Choose file (simulated picker)</Label>
          <NativeSelect id="up-file" aria-invalid={!!error || undefined} aria-describedby="up-file-h" {...form.register("file", { onChange: () => setError("") })}>
            <NativeSelectOption value="">Select a file</NativeSelectOption>
            <NativeSelectOption value="ok">bank_statements_aug-oct.pdf · 2.4 MB</NativeSelectOption>
            <NativeSelectOption value="type">statement_photo.heic · 3.1 MB</NativeSelectOption>
            <NativeSelectOption value="size">statements_scan.pdf · 41 MB</NativeSelectOption>
          </NativeSelect>
          <span id="up-file-h" className="text-xs text-muted-foreground">
            PDF, JPG or PNG, up to {UPLOAD_LIMIT_MB} MB.
          </span>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" variant="primary" wide>
          Submit documents
        </Button>
      </form>
    </div>
  )
}
