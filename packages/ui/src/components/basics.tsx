import type { ReactNode } from "react";
import { STATUS_HINT, STATUS_LABEL, type Status } from "@ground/core";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Label({ children, className, as: As = "span" }: { children: ReactNode; className?: string; as?: "span" | "p" | "div" | "h2" | "h3" }) {
  return <As className={cx("lbl", className)}>{children}</As>;
}

export function Say({ children, big, className }: { children: ReactNode; big?: boolean; className?: string }) {
  return <p className={cx("say m-0", big && "say-big", className)}>{children}</p>;
}

export function GroundMark({ width = 96, label = "Símbolo Ground Project", className }: { width?: number; label?: string | null; className?: string }) {
  return <span className={cx("ground-mark", className)} style={{ width }} role={label ? "img" : undefined} aria-label={label ?? undefined} aria-hidden={label ? undefined : true} />;
}

/** Selo do estado, sempre com texto (não só o traço): acessível para quem não vê o estilo. */
export function StatusTag({ status, children }: { status: Status; children?: ReactNode }) {
  return (
    <span className="lbl inline-flex items-center gap-2" title={STATUS_HINT[status]}>
      <i className={`swatch swatch-${status}`} aria-hidden />
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}

export function Button({ children, variant = "outline", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" | "solid" }) {
  return (
    <button type="button" className={cx("btn", variant === "solid" && "btn-solid", className)} {...rest}>
      {children}
    </button>
  );
}

export function PageHeader({ label, title, sub }: { label?: ReactNode; title: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-7">
      {label && <Label>{label}</Label>}
      <h1 className="h1 mt-2 mb-2.5">{title}</h1>
      {sub && <p className="sub m-0">{sub}</p>}
    </header>
  );
}
