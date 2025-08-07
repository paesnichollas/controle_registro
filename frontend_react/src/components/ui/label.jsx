"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

const Label = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <label
      className={cn("text-white font-medium text-sm", className)}
      ref={ref}
      {...props}
    />
  );
})

Label.displayName = "Label"

export { Label }
