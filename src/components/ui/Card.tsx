import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover, children, ...props }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--bg-card)] border-[var(--border)] p-4 shadow-[var(--shadow-sm)]",
        hover && "cursor-pointer transition-transform hover:scale-[1.015] hover:shadow-[var(--shadow)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
