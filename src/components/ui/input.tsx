import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  disableUppercase?: boolean
  allowMixedCase?: boolean
}

function Input({ className, type, name, id, onChange, disableUppercase, allowMixedCase, ...props }: InputProps) {
  const isEmailOrPasswordOrMixed = 
    type === "number" || 
    type === "date" || 
    type === "time" || 
    type === "file" || 
    type === "checkbox" || 
    type === "password" || 
    type === "email" || 
    name === "email" || 
    id === "email" || 
    name === "username" || 
    id === "username" ||
    name === "password" ||
    id === "password" ||
    disableUppercase || 
    allowMixedCase

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEmailOrPasswordOrMixed && e.target.value) {
      e.target.value = e.target.value.toUpperCase()
    }
    if (onChange) onChange(e)
  }

  return (
    <InputPrimitive
      type={type}
      name={name}
      id={id}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        !isEmailOrPasswordOrMixed && "uppercase",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Input }
