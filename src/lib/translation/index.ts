import type { TranslationProvider } from "./provider"
import { MyMemoryProvider } from "./providers/mymemory"
import { DeepLProvider } from "./providers/deepl"
import { HuggingFaceProvider } from "./providers/hf"

export function getProvider(name: string): TranslationProvider {
  switch (name) {
    case "deepl":
      return new DeepLProvider()
    case "hf":
      return new HuggingFaceProvider()
    default:
      return new MyMemoryProvider()
  }
}
