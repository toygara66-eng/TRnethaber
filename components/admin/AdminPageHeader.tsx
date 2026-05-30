import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function AdminPageHeader({ title, description, action }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-trnet-text/60">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="w-full shrink-0 sm:w-auto [&_.admin-btn-primary]:w-full sm:[&_.admin-btn-primary]:w-auto">
          {action}
        </div>
      ) : null}
    </div>
  );
}
