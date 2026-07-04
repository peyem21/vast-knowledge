/**
 * Lightweight, keyword-based narrative tagging.
 *
 * This is intentionally simple and transparent so it's easy to tune. Each
 * narrative maps to a list of keywords matched (case-insensitive, word-ish)
 * against a token's name, symbol, and description. A token can belong to
 * multiple narratives. Upgrade path: replace with an embedding/LLM classifier
 * once we want fuzzier grouping.
 */
const NARRATIVE_KEYWORDS: Record<string, string[]> = {
  AI: ["ai", "agent", "gpt", "llm", "neural", "model", "ml", "intelligence", "bot", "deepseek"],
  DePIN: ["depin", "render", "helium", "wifi", "node", "compute", "gpu", "bandwidth", "storage", "infra"],
  Memes: ["meme", "pepe", "wojak", "chad", "doge", "shib", "inu", "moon", "pump", "frog", "wif", "bonk"],
  Dogs: ["doge", "inu", "shib", "wif", "bonk", "dog", "puppy", "akita", "floki"],
  Cats: ["cat", "kitty", "meow", "popcat", "mew", "felis"],
  RWA: ["rwa", "real world", "treasury", "bond", "tokenized", "gold", "estate", "commodity"],
  DeFi: ["defi", "swap", "lend", "yield", "stake", "vault", "perp", "dex", "amm", "liquidity"],
  Gaming: ["game", "gaming", "play", "metaverse", "nft", "guild", "p2e", "arcade"],
  Politics: ["trump", "biden", "maga", "election", "president", "vance", "kamala", "政治"],
  Solana: ["sol", "solana", "saga", "jupiter", "jito"],
  Stablecoin: ["usd", "stable", "dollar", "peg"],
  Celebrity: ["elon", "musk", "celeb", "kanye", "ye", "andrew tate", "tate"],
};

/**
 * Returns the list of narratives a token belongs to based on its text fields.
 */
export function tagNarratives(
  name: string,
  symbol: string,
  description?: string | null
): string[] {
  const haystack = `${name} ${symbol} ${description ?? ""}`.toLowerCase();
  const tags = new Set<string>();

  for (const [narrative, keywords] of Object.entries(NARRATIVE_KEYWORDS)) {
    for (const kw of keywords) {
      // Match whole words or hashtag-ish substrings to limit false positives.
      const re = new RegExp(`(^|[^a-z])${escapeRegExp(kw)}([^a-z]|$)`, "i");
      if (re.test(haystack)) {
        tags.add(narrative);
        break;
      }
    }
  }

  return [...tags];
}

export function allNarratives(): string[] {
  return Object.keys(NARRATIVE_KEYWORDS);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
