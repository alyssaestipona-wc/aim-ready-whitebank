"use client"

import * as React from "react"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

/** Underline tabs, as in the prototype's `.tabs`. */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col", className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "mb-4 flex gap-[22px] overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "-mb-px border-b-2 border-transparent bg-transparent py-[9px] text-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:text-strong focus-visible:text-strong data-[state=active]:border-ink data-[state=active]:font-semibold data-[state=active]:text-strong",
        className
      )}
      {...props}
    />
  )
}

/** Count suffix inside a tab trigger, e.g. "My queue 12". */
function TabsCount({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("ml-1.5 font-mono text-[11px] font-medium text-muted-foreground", className)} {...props} />
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />
}

export { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger }
