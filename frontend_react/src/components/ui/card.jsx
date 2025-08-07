import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef(({
  className,
  ...props
}, ref) => {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})

const CardHeader = React.forwardRef(({
  className,
  ...props
}, ref) => {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      ref={ref}
      {...props} />
  );
})

const CardTitle = React.forwardRef(({
  className,
  ...props
}, ref) => {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      ref={ref}
      {...props} />
  );
})

const CardDescription = React.forwardRef(({
  className,
  ...props
}, ref) => {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      ref={ref}
      {...props} />
  );
})

const CardAction = React.forwardRef(({
  className,
  ...props
}, ref) => {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      ref={ref}
      {...props} />
  );
})

const CardContent = React.forwardRef(({
  className,
  ...props
}, ref) => {
  return (<div data-slot="card-content" className={cn("px-6", className)} ref={ref} {...props} />);
})

const CardFooter = React.forwardRef(({
  className,
  ...props
}, ref) => {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      ref={ref}
      {...props} />
  );
})

Card.displayName = "Card"
CardHeader.displayName = "CardHeader"
CardTitle.displayName = "CardTitle"
CardDescription.displayName = "CardDescription"
CardAction.displayName = "CardAction"
CardContent.displayName = "CardContent"
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
