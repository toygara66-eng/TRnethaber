import type { ReactNode } from "react";

type Props = {
  action: (formData: FormData) => void;
  rteFormName?: string;
  status?: ReactNode;
  main: ReactNode;
  sidebar: ReactNode;
  footer: ReactNode;
  className?: string;
  /** Kapak yüklenirken form gönderimini engelle */
  submitBlocked?: boolean;
};

export function AdminArticleEditorShell({
  action,
  rteFormName = "content",
  status,
  main,
  sidebar,
  footer,
  className = "",
  submitBlocked = false,
}: Props) {
  return (
    <form
      action={action}
      data-rte-form={rteFormName}
      className={`mx-auto w-full max-w-[1400px] ${className}`}
      onSubmit={(e) => {
        if (submitBlocked) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {status}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)] lg:gap-10">
        <div className="min-w-0 space-y-8">{main}</div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">{sidebar}</aside>
      </div>

      <div className="mt-10 border-t border-black/[0.06] pt-6">{footer}</div>
    </form>
  );
}

type SidebarCardProps = {
  title: string;
  children: ReactNode;
  hint?: string;
};

export function AdminSidebarCard({ title, children, hint }: SidebarCardProps) {
  return (
    <section className="admin-card overflow-hidden">
      <div className="border-b border-black/[0.06] bg-trnet-surface/60 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-trnet-text/70">
          {title}
        </h3>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-trnet-text/45">{hint}</p> : null}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
};

export function AdminField({ label, htmlFor, children, hint }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-trnet-text">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-trnet-text/45">{hint}</p> : null}
    </div>
  );
}
