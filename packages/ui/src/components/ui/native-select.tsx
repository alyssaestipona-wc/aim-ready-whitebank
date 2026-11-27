import * as React from "react"
import { cn } from "cn"
import { ChevronDownIcon } from "lucide-react"

import { fieldControl } from "./input"

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  /** "sm" is the compact list-filter look; "default" is the form field. */
  size?: "sm" | "default"
  /** Highlights the control in the accent when a filter value is set. */
  active?: boolean
  wrapperClassName?: string
}

function NativeSelect({
  className,
  wrapperClassName,
  size = "default",
  active = false,
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn("relative has-[select:disabled]:opacity-60", size === "default" ? "w-full" : "w-fit", wrapperClassName)}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        data-active={active || undefined}
        className={cn(
          fieldControl,
          "pr-[30px]",
          size === "sm" && "py-1.5 pl-2.5 text-sm",
          active && "border-brand text-brand-700",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-g-500"
        aria-hidden="true"
      />
    </div>
  )
}

function NativeSelectOption(props: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />
}

export { NativeSelect, NativeSelectOption }
