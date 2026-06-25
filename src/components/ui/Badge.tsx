import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  color?: string; // hex color, e.g. "#EC4899"
  className?: string;
}

export function Badge({ children, color, className }: Props) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", className)}
      style={
        color
          ? { backgroundColor: color + "22", color, border: `1px solid ${color}44` }
          : { backgroundColor: "var(--bg-muted)", color: "var(--text-muted)" }
      }
    >
      {children}
    </span>
  );
}
