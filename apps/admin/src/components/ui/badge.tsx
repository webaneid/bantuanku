import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-blue-100 text-blue-800 border-transparent",
    secondary: "bg-gray-100 text-gray-800 border-transparent",
    destructive: "bg-red-100 text-red-800 border-transparent",
    outline: "border border-gray-300 text-gray-700",
    success: "bg-green-100 text-green-800 border-transparent",
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${
        variants[variant]
      } ${className || ""}`}
      {...props}
    />
  )
}

export { Badge }
