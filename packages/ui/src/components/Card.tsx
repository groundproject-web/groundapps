import type { ReactNode } from "react";
import { STATUS_LABEL, type Status } from "@ground/core";
import { cx, StatusTag } from "./basics";

/**
 * Card com a variante de estado (gramática do traço):
 * fato = traço sólido · hipotese = tracejado · gargalo = hachura · sem_info = pontilhado/vazado
 */
export function Card({
  status,
  title,
  tag,
  children,
  className,
  as: As = "article",
}: {
  status?: Status;
  title?: ReactNode;
  /** texto do selo; padrão é o nome do estado */
  tag?: ReactNode | false;
  children?: ReactNode;
  className?: string;
  as?: "article" | "section" | "div";
}) {
  return (
    <As
      className={cx("rounded-[14px] p-5 flex flex-col gap-3 min-w-0 bg-deep", status ? `st-${status}` : "border border-[var(--rule)]", className)}
      data-status={status}
      aria-label={status && typeof title === "string" ? `${title} · ${STATUS_LABEL[status]}` : undefined}
    >
      {(title || (status && tag !== false)) && (
        <header className="flex justify-between gap-2.5 items-baseline">
          {title ? <h3 className="m-0 font-display font-semibold text-[18px]">{title}</h3> : <span />}
          {status && tag !== false && <StatusTag status={status}>{tag}</StatusTag>}
        </header>
      )}
      {children}
    </As>
  );
}
