"use client";

type Props = {
  textareaId: string;
};

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end) || placeholder;
  const next =
    textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);

  textarea.value = next;
  const cursor = start + before.length + selected.length + after.length;
  textarea.setSelectionRange(cursor, cursor);
  textarea.focus();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function prefixLines(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const blockEnd = lineEnd === -1 ? value.length : lineEnd;
  const block = value.slice(lineStart, blockEnd);
  const lines = block.split("\n").map((line) => `${prefix}${line}`);
  const next = value.slice(0, lineStart) + lines.join("\n") + value.slice(blockEnd);
  textarea.value = next;
  textarea.focus();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyHeading(textarea: HTMLTextAreaElement, level: 1 | 2 | 3) {
  const hashes = "#".repeat(level) + " ";
  prefixLines(textarea, hashes);
}

export function MarkdownToolbar({ textareaId }: Props) {
  const run = (fn: (el: HTMLTextAreaElement) => void) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!el) return;
    fn(el);
  };

  const btn =
    "rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-trnet-text transition hover:border-trnet-primary/40 hover:text-trnet-primary";

  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-t-xl border border-b-0 border-black/10 bg-trnet-surface/80 p-2"
      role="toolbar"
      aria-label="Metin biçimlendirme"
    >
      <button type="button" className={btn} onClick={() => run((el) => applyHeading(el, 1))}>
        H1
      </button>
      <button type="button" className={btn} onClick={() => run((el) => applyHeading(el, 2))}>
        H2
      </button>
      <button type="button" className={btn} onClick={() => run((el) => applyHeading(el, 3))}>
        H3
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => run((el) => wrapSelection(el, "**", "**", "kalın metin"))}
      >
        Kalın
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => run((el) => wrapSelection(el, "*", "*", "italik metin"))}
      >
        İtalik
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => run((el) => prefixLines(el, "- "))}
      >
        Liste
      </button>
    </div>
  );
}
