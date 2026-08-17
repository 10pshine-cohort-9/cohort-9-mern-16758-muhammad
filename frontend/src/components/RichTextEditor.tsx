import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { useEffect, type ReactElement } from "react";

import { richTextExtensions } from "../rich-text";

interface RichTextEditorProps {
  content: JSONContent;
  disabled: boolean;
  autoFocus: boolean;
  onChange: (content: JSONContent) => void;
}

function RichTextEditor({
  content,
  disabled,
  autoFocus,
  onChange,
}: RichTextEditorProps): ReactElement {
  const editor = useEditor({
    extensions: richTextExtensions,
    content,
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        "aria-label": "Content",
        class: "rich-text-content",
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getJSON());
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const controlsDisabled = disabled || !editor;

  return (
    <div className="rich-text-editor">
      <span className="editor-label">Content</span>

      <div className="rich-text-toolbar" aria-label="Text formatting">
        <button
          type="button"
          className={editor?.isActive("heading", { level: 2 }) ? "active" : ""}
          aria-label="Heading"
          aria-pressed={editor?.isActive("heading", { level: 2 }) ?? false}
          disabled={controlsDisabled}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </button>
        <button
          type="button"
          className={editor?.isActive("heading", { level: 3 }) ? "active" : ""}
          aria-label="Subheading"
          aria-pressed={editor?.isActive("heading", { level: 3 }) ?? false}
          disabled={controlsDisabled}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </button>
        <button
          type="button"
          className={editor?.isActive("bold") ? "active" : ""}
          aria-label="Bold"
          aria-pressed={editor?.isActive("bold") ?? false}
          disabled={controlsDisabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={editor?.isActive("italic") ? "active" : ""}
          aria-label="Italic"
          aria-pressed={editor?.isActive("italic") ?? false}
          disabled={controlsDisabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={editor?.isActive("bulletList") ? "active" : ""}
          aria-label="Bullet list"
          aria-pressed={editor?.isActive("bulletList") ?? false}
          disabled={controlsDisabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </button>
        <button
          type="button"
          className={editor?.isActive("orderedList") ? "active" : ""}
          aria-label="Numbered list"
          aria-pressed={editor?.isActive("orderedList") ?? false}
          disabled={controlsDisabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </button>
        <button
          type="button"
          aria-label="Clear formatting"
          disabled={controlsDisabled}
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          Clear
        </button>
        <button
          type="button"
          aria-label="Undo"
          disabled={
            controlsDisabled || !editor?.can().chain().focus().undo().run()
          }
          onClick={() => editor?.chain().focus().undo().run()}
        >
          Undo
        </button>
        <button
          type="button"
          aria-label="Redo"
          disabled={
            controlsDisabled || !editor?.can().chain().focus().redo().run()
          }
          onClick={() => editor?.chain().focus().redo().run()}
        >
          Redo
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;
