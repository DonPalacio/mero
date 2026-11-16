import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MAX_TEXT_LENGTH, buildRequestBody, extractAiResult } from "../lib/voice-api";
import { transactionTypeSchema, type AiResult } from "../lib/voice-parse";

const MAX_NAME_LENGTH = 100;
const MAX_ITEMS = 200;
const REQUEST_TIMEOUT_MS = 15_000;

export type ParseVoiceResult =
  | { readonly ok: true; readonly result: AiResult }
  | { readonly ok: false; readonly reason: "unauthorized" | "unavailable" | "unparseable" };

const name = z.string().trim().min(1).max(MAX_NAME_LENGTH);

// Solo viajan nombres: el servidor no recibe ids ni saldos.
const input = z.object({
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  categories: z.array(z.object({ name, type: transactionTypeSchema })).max(MAX_ITEMS),
  boxes: z.array(z.object({ name })).max(MAX_ITEMS),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// En desarrollo Vite carga .env.local en import.meta.env (no en process.env); en Vercel están
// en process.env. Mismo criterio que supabase-server.ts, pero sin prefijo VITE_ para que la
// clave nunca llegue al bundle del navegador.
const readApiKey = (): string =>
  process.env["ANTHROPIC_API_KEY"] ??
  (import.meta.env["ANTHROPIC_API_KEY"] as string | undefined) ??
  "";

// POST como el resto de server functions. Devuelve { ok } en vez de lanzar para que el
// middleware de errores no convierta un fallo de la IA en una página 500.
export const parseVoiceTransaction = createServerFn({ method: "POST" })
  .inputValidator(input)
  .handler(async ({ data }): Promise<ParseVoiceResult> => {
    // Sin sesión válida no se gasta cuota de IA.
    const supabase = createSupabaseServerClient();
    const { data: auth, error } = await supabase.auth.getClaims();
    if (error || !auth?.claims) return { ok: false, reason: "unauthorized" };

    const apiKey = readApiKey();
    if (apiKey === "") return { ok: false, reason: "unavailable" };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(
        buildRequestBody(data.text, {
          categories: data.categories,
          boxes: data.boxes,
          today: data.today,
        }),
      ),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => null);

    if (response === null || !response.ok) return { ok: false, reason: "unavailable" };

    const result = extractAiResult(await response.json().catch(() => null));
    return result === undefined ? { ok: false, reason: "unparseable" } : { ok: true, result };
  });
