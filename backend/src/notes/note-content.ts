export type JsonValue =
  string | number | boolean | null | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface ParsedNoteContent {
  content: JsonObject;
  plainText: string;
}

const MAX_DOCUMENT_DEPTH = 20;
const ALLOWED_MARKS = new Set(["bold", "italic"]);
const ALLOWED_CHILDREN: Record<string, ReadonlySet<string>> = {
  doc: new Set(["paragraph", "heading", "bulletList", "orderedList"]),
  paragraph: new Set(["text", "hardBreak"]),
  heading: new Set(["text", "hardBreak"]),
  bulletList: new Set(["listItem"]),
  orderedList: new Set(["listItem"]),
  listItem: new Set(["paragraph", "bulletList", "orderedList"]),
  text: new Set(),
  hardBreak: new Set(),
};
const REQUIRED_CONTENT = new Set([
  "doc",
  "bulletList",
  "orderedList",
  "listItem",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRichTextNode(
  value: unknown,
  parentType?: string,
  depth = 0,
): value is JsonObject {
  if (depth > MAX_DOCUMENT_DEPTH || !isObject(value)) {
    return false;
  }

  const nodeType = value.type;

  if (typeof nodeType !== "string") {
    return false;
  }

  const allowedChildren = ALLOWED_CHILDREN[nodeType];

  if (
    !allowedChildren ||
    (parentType === undefined
      ? nodeType !== "doc"
      : !ALLOWED_CHILDREN[parentType]?.has(nodeType))
  ) {
    return false;
  }

  if (
    nodeType === "heading" &&
    (!isObject(value.attrs) ||
      (value.attrs.level !== 2 && value.attrs.level !== 3))
  ) {
    return false;
  }

  if (nodeType === "text") {
    const validMarks =
      value.marks === undefined ||
      (Array.isArray(value.marks) &&
        value.marks.every(
          (mark) =>
            isObject(mark) &&
            typeof mark.type === "string" &&
            ALLOWED_MARKS.has(mark.type),
        ));

    return (
      typeof value.text === "string" &&
      value.text.length > 0 &&
      value.content === undefined &&
      validMarks
    );
  }

  if (value.text !== undefined || value.marks !== undefined) {
    return false;
  }

  if (nodeType === "hardBreak") {
    return value.content === undefined;
  }

  if (!Array.isArray(value.content)) {
    return !REQUIRED_CONTENT.has(nodeType) && value.content === undefined;
  }

  return (
    (!REQUIRED_CONTENT.has(nodeType) || value.content.length > 0) &&
    value.content.every((child) => isRichTextNode(child, nodeType, depth + 1))
  );
}

function getText(value: JsonValue): string {
  if (Array.isArray(value)) {
    return value.map(getText).join("");
  }

  if (typeof value !== "object" || value === null) {
    return "";
  }

  if (value.type === "hardBreak") {
    return "\n";
  }

  const ownText = typeof value.text === "string" ? value.text : "";
  const childText = Array.isArray(value.content)
    ? value.content.map(getText).join("")
    : "";
  const lineBreak =
    value.type === "paragraph" || value.type === "heading" ? "\n" : "";

  return `${ownText}${childText}${lineBreak}`;
}

export function parseNoteContent(input: unknown): ParsedNoteContent | null {
  if (!isRichTextNode(input)) {
    return null;
  }

  return {
    content: input,
    plainText: getText(input).trimEnd(),
  };
}
