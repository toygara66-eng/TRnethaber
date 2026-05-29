"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  Quote,
} from "lucide-react";
import { uploadNewsImage } from "@/lib/actions/upload-cover-image";
import { toEditorHtml } from "@/lib/articles/html-content";

type Props = {
  name: string;
  initialContent?: string;
  required?: boolean;
  minHeight?: number;
};

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${
        active
          ? "border-trnet-primary bg-trnet-primary/10 text-trnet-primary"
          : "border-black/10 bg-white text-trnet-text/70 hover:border-trnet-primary/40 hover:bg-trnet-surface hover:text-trnet-text"
      }`}
    >
      {children}
    </button>
  );
}

const INLINE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

function EditorToolbar({
  editor,
  onPickImage,
  imageUploading,
}: {
  editor: Editor | null;
  onPickImage: () => void;
  imageUploading: boolean;
}) {
  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-black/[0.08] bg-trnet-surface/80 px-3 py-2.5">
      <ToolbarButton
        title="Ara Başlık (H2)"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">H2</span>
      </ToolbarButton>
      <ToolbarButton
        title="Alt Başlık (H3)"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">H3</span>
      </ToolbarButton>

      <span className="mx-1 h-6 w-px bg-black/10" aria-hidden />

      <ToolbarButton
        title="Kalın"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="İtalik"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-6 w-px bg-black/10" aria-hidden />

      <ToolbarButton
        title="Madde işaretli liste"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Alıntı"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-6 w-px bg-black/10" aria-hidden />

      <ToolbarButton title="Link ekle" onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-6 w-px bg-black/10" aria-hidden />

      <ToolbarButton
        title="Görsel yükle"
        onClick={() => {
          if (!imageUploading) onPickImage();
        }}
      >
        {imageUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  name,
  initialContent = "",
  required = false,
  minHeight = 480,
}: Props) {
  const [html, setHtml] = useState(() => toEditorHtml(initialContent));
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: {},
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-trnet-primary underline underline-offset-2",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "my-6 max-w-full rounded-lg",
        },
      }),
      Placeholder.configure({
        placeholder: "Haber metnini buraya yazın…",
      }),
    ],
    content: toEditorHtml(initialContent),
    editorProps: {
      attributes: {
        class: "article-editor-prose focus:outline-none",
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      setHtml(ed.getHTML());
    },
  });

  const handleInlineImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setImageUploading(true);
      try {
        const body = new FormData();
        body.set("file", file);
        body.set("folder", "inline");
        const result = await uploadNewsImage(body);
        if (result.ok) {
          editor.chain().focus().setImage({ src: result.url, alt: "" }).run();
        } else {
          window.alert(result.error);
        }
      } catch {
        window.alert("Görsel yüklenemedi.");
      } finally {
        setImageUploading(false);
      }
    },
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(initialContent);
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
      setHtml(next);
    }
  }, [initialContent, editor]);

  const validateBeforeSubmit = useCallback(
    (form: HTMLFormElement) => {
      if (!required) return true;
      const text = editor?.getText().trim() ?? "";
      if (text.length > 0) return true;
      window.alert("İçerik alanı zorunludur.");
      return false;
    },
    [editor, required],
  );

  useEffect(() => {
    const form = document.querySelector(`form[data-rte-form="${name}"]`);
    if (!form || !editor) return;

    const onSubmit = (event: Event) => {
      if (!validateBeforeSubmit(form as HTMLFormElement)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [editor, name, validateBeforeSubmit]);

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <input
        ref={imageInputRef}
        id="rte-inline-image-input"
        type="file"
        accept={INLINE_IMAGE_ACCEPT}
        className="sr-only"
        disabled={imageUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleInlineImage(file);
          e.target.value = "";
        }}
      />
      <EditorToolbar
        editor={editor}
        imageUploading={imageUploading}
        onPickImage={() => imageInputRef.current?.click()}
      />
      <div className="article-editor-surface px-4 py-4 sm:px-6 sm:py-5">
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
