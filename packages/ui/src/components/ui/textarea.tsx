import * as React from "react"
import { cn } from "cn"

import { fieldControl } from "./input"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldControl, "min-h-[76px] resize-y", className)}
      {...props}
    />
  )
}

export { Textarea }
