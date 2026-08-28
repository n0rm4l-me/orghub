import type { TranslationProvider } from "../provider"

// Helsinki-NLP models follow the pattern Helsinki-NLP/opus-mt-{src}-{tgt}
// We use "en" as the pivot language for non-English pairs.
const MODEL: Record<string, string> = {
  ru: "Helsinki-NLP/opus-mt-en-ru",
  ja: "Helsinki-NLP/opus-mt-en-jap",
  zh: "Helsinki-NLP/opus-mt-en-zh",
  es: "Helsinki-NLP/opus-mt-en-es",
  fr: "Helsinki-NLP/opus-mt-en-fr",
  hi: "Helsinki-NLP/opus-mt-en-hi",
  uk: "Helsinki-NLP/opus-mt-en-uk",
  de: "Helsinki-NLP/opus-mt-en-de",
  en: "Helsinki-NLP/opus-mt-ROMANCE-en",
}

export class HuggingFaceProvider implements TranslationProvider {
  private readonly token: string

  constructor() {
    const t = process.env.HF_TOKEN
    if (!t) throw new Error("HF_TOKEN is not set")
    this.token = t
  }

  async translate(text: string, targetLang: string): Promise<string> {
    const model = MODEL[targetLang]
    if (!model) throw new Error(`No HF model configured for language: ${targetLang}`)

    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) throw new Error(`HuggingFace API ${res.status}`)
    const data = await res.json()
    const translated = Array.isArray(data) ? data[0]?.translation_text : data?.translation_text
    if (!translated) throw new Error("HuggingFace returned no translation")
    return translated as string
  }
}
