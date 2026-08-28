import type { TranslationProvider } from "../provider"

export class MyMemoryProvider implements TranslationProvider {
  async translate(text: string, targetLang: string): Promise<string> {
    const url = new URL("https://api.mymemory.translated.net/get")
    url.searchParams.set("q", text)
    url.searchParams.set("langpair", `autodetect|${targetLang}`)
    const email = process.env.MYMEMORY_EMAIL
    if (email) url.searchParams.set("de", email)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) throw new Error(`MyMemory API ${res.status}`)
    const data = await res.json()
    if (data?.responseStatus === 200 && data?.responseData?.translatedText) {
      return data.responseData.translatedText as string
    }
    throw new Error(data?.responseDetails ?? "Translation failed")
  }
}
