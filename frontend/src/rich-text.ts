import {
  createNodeFromContent,
  getSchema,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const MAX_DOCUMENT_DEPTH = 20;

export const richTextExtensions = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: {
      levels: [2, 3],
    },
    horizontalRule: false,
    link: false,
    strike: false,
    underline: false,
  }),
];

function hasSafeDepth(value: unknown, depth = 0): boolean {
  if (
    depth > MAX_DOCUMENT_DEPTH ||
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const content = (value as Record<string, unknown>).content;

  return (
    content === undefined ||
    (Array.isArray(content) &&
      content.every((child) => hasSafeDepth(child, depth + 1)))
  );
}

export function isRichTextContent(value: unknown): value is JSONContent {
  if (!hasSafeDepth(value)) {
    return false;
  }

  try {
    createNodeFromContent(value as JSONContent, getSchema(richTextExtensions), {
      slice: false,
      errorOnInvalidContent: true,
    });
    return true;
  } catch {
    return false;
  }
}
