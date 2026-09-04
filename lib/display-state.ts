export const STORAGE_KEY = "webmcp-display-text";
export const MAX_TEXT_LENGTH = 2_000;

export function assertValidText(text: unknown): asserts text is string {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (text.length > MAX_TEXT_LENGTH) throw new RangeError(`text must be ${MAX_TEXT_LENGTH} characters or fewer`);
}
