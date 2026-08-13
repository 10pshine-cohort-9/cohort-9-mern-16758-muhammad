export type JsonValue =
  string | number | boolean | null | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface ParsedNoteContent {
  content: JsonObject;
  plainText: string;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value !== "object") {
    return false;
  }

  return Object.values(value).every(isJsonValue);
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && isJsonValue(value);
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
    value.type === "paragraph" ||
    value.type === "heading" ||
    value.type === "codeBlock"
      ? "\n"
      : "";

  return `${ownText}${childText}${lineBreak}`;
}

export function parseNoteContent(input: unknown): ParsedNoteContent | null {
  if (!isJsonObject(input)) {
    return null;
  }

  if (input.type !== "doc" || !Array.isArray(input.content)) {
    return null;
  }

  return {
    content: input,
    plainText: getText(input).trimEnd(),
  };
}
