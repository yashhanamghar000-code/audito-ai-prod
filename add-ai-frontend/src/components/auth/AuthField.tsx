import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls =
  "h-12 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-brand focus:ring-4 focus:ring-brand/15";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; id: string };

function FieldLabel({ id, label }: { id: string; label: string }) {
  return (
    <label htmlFor={id} className="flex items-center gap-1 text-sm font-medium text-foreground">
      <span className="text-highlight">*</span>
      {label}
    </label>
  );
}

export function AuthField({ label, id, className, ...rest }: Props) {
  return (
    <div className="space-y-2">
      <FieldLabel id={id} label={label} />
      <input id={id} className={cn(inputCls, className)} {...rest} />
    </div>
  );
}

export function PasswordField({ label, id, right, ...rest }: Props & { right?: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <FieldLabel id={id} label={label} />
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} className={cn(inputCls, "pr-11")} {...rest} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {right}
    </div>
  );
}
