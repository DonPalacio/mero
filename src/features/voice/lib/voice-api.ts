import { z } from "zod";
import { aiResultSchema, type AiResult } from "./voice-parse";
import { EXTRACTION_TOOL, buildSystemPrompt, type PromptContext } from "./voice-prompt";

export const VOICE_MODEL = "claude-haiku-5-5";
export const MAX_TEXT_LENGTH = 300;

// Solo lo que necesitamos de la respuesta de la API de Mensajes; el resto se ignora.
const responseSchema = z.object({
  content: z.array(z.object({ type: z.string(), input: z.unknown().optional() })),
});

/** Cuerpo de la petición a la API de Mensajes, forzando el uso de la herramienta. */
export function buildRequestBody(text: string, context: PromptContext) {
  return {
    model: VOICE_MODEL,
    max_tokens: 300,
    system: buildSystemPrompt(context),
    messages: [{ role: "user", content: text }],
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
  } as const;
}

/** Extrae y valida el resultado de la herramienta; `undefined` si la respuesta no es usable. */
export function extractAiResult(payload: unknown): AiResult | undefined {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) return undefined;
  const block = parsed.data.content.find((item) => item.type === "tool_use");
  const result = aiResultSchema.safeParse(block?.input);
  return result.success ? result.data : undefined;
}
