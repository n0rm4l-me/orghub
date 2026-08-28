import type { TranslationProvider } from "../provider"

export class DeepLProvider implements TranslationProvider {
  private readonly apiKey: string

  constructor() {
    const key = process.env.DEEPL_API_KEY
    if (!key) throw new Error("DEEPL_API_KEY is not set")
    this.apiKey = key
  }

  async translate(text: string, targetLang: string): Promise<string> {
    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: [text], target_lang: targetLang.toUpperCase() }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`DeepL API ${res.status}`)
    const data = await res.json()
    const translated = data?.translations?.[0]?.text
    if (!translated) throw new Error("DeepL returned no translation")
    return translated as string
  }
}
