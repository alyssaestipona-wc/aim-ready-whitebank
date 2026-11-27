"use client"

import * as React from "react"

import { Button } from "./ui/button"
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"

export type ConfirmResult = void | string | Promise<void | string>

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  /** Confirm button label. */
  okLabel?: string
  cancelLabel?: string
  /** A destructive confirm: solid ink, as the prototype's `.btn.dan.solid`. */
  danger?: boolean
  /** Hide Cancel (e.g. read-only viewers with a single Close). */
  noCancel?: boolean
  wide?: boolean
  /**
   * Runs on confirm. Return an error message to keep the dialog open and show
   * it in red; return nothing to close.
   */
  onConfirm: () => ConfirmResult
}

/** The prototype's modal: title, description, body, red inline error, actions. */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  okLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  noCancel = false,
  wide = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  // Dialogs are opened from ordinary buttons, not a DialogTrigger, so remember
  // what had focus and hand it back on close.
  const opener = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (open) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    else setError("")
  }, [open])

  async function confirm() {
    setBusy(true)
    try {
      const result = await onConfirm()
      if (typeof result === "string" && result) setError(result)
      else onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        wide={wide}
        onCloseAutoFocus={(e) => {
          if (opener.current?.isConnected) {
            e.preventDefault()
            opener.current.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <DialogBody>
          {children}
          <div role={error ? "alert" : undefined} className="min-h-1 pb-1.5 text-[12.5px] font-medium text-danger">
            {error}
          </div>
        </DialogBody>
        <DialogFooter>
          {!noCancel && (
            <DialogClose asChild>
              <Button>{cancelLabel}</Button>
            </DialogClose>
          )}
          <Button variant="primary"
            data-danger={danger || undefined} disabled={busy} onClick={confirm}>
            {okLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ConfirmDialog }
