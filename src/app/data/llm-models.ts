export interface TextModelOption {
  id: string;
  label: string;
  approxSizeMb: number;
}

/** The WebLLM text models offered in the chat header dropdown, from biggest to smallest. */
export const TEXT_MODEL_OPTIONS: readonly TextModelOption[] = [
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 — 3B', approxSizeMb: 2264 },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Gemma 2 — 2B', approxSizeMb: 1895 },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 — 1.5B', approxSizeMb: 1630 },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 — 1B', approxSizeMb: 879 },
  { id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', label: 'SmolLM2 — 360M', approxSizeMb: 376 },
];

/** Small and fast by default: performance over accuracy. */
export const DEFAULT_TEXT_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

/**
 * The vision-language model. It is a standalone model (Phi-3.5-mini + an image encoder),
 * so when it is loaded it also answers text-only messages: no text model is paired with it.
 */
export const VISION_MODEL_ID = 'Phi-3.5-vision-instruct-q4f16_1-MLC';

export const VISION_MODEL_LABEL = 'Phi-3.5 Vision';

export function modelLabel(id: string): string {
  if (id === VISION_MODEL_ID) return VISION_MODEL_LABEL;
  return TEXT_MODEL_OPTIONS.find((model) => model.id === id)?.label ?? id;
}
