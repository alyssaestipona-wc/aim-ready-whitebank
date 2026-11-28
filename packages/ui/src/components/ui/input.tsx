import * as React from "react"
import { cn } from "cn"

const fieldControl =
  "w-full min-w-0 appearance-none rounded-md border border-input bg-paper px-[11px] py-2 text-[13.5px] text-strong outline-none transition-[border-color,box-shadow] placeholder:text-subtle focus:border-brand focus:ring-3 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-g-100 disabled:text-subtle aria-invalid:border-danger aria-invalid:focus:ring-danger-bg"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldControl, className)}
      {...props}
    />
  )
}

export { Input, fieldControl }
