import { MAX_TEXT_LENGTH, assertValidText } from "./display-state";

type ToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<{ success: true }>;
};
type ModelContext = { registerTool: (tool: ToolDefinition, options?: { signal?: AbortSignal }) => void | Promise<void> };

declare global {
  interface Document { modelContext?: ModelContext; }
  interface Navigator { modelContext?: ModelContext; }
}

export const SET_TEXT_TOOL_NAME = "set_text";

export function registerDisplayTool(setText: (text: string) => void): () => void {
  const modelContext = document.modelContext ?? navigator.modelContext;
  if (!modelContext) return () => undefined;
  const controller = new AbortController();
  const tool: ToolDefinition = {
    name: SET_TEXT_TOOL_NAME,
    title: "Set display text",
    description: "Replace all text currently shown on the TV display with plain text. Newlines and Unicode are preserved.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", maxLength: MAX_TEXT_LENGTH, description: "Plain text to display. May contain deliberate newlines and any Unicode characters." } },
      required: ["text"],
      additionalProperties: false,
    },
    execute: async (input) => {
      const value = input?.text;
      assertValidText(value);
      setText(value);
      return { success: true };
    },
  };
  void Promise.resolve(modelContext.registerTool(tool, { signal: controller.signal })).catch((error: unknown) => console.error("Unable to register the WebMCP set_text tool", error));
  return () => controller.abort();
}
