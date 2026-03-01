type IntOptions = { min: number; max: number };
type BooleanOptions = { probability?: number };

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

let random = mulberry32(Date.now());

function nextFloat(): number {
  return random();
}

function int({ min, max }: IntOptions): number {
  const safeMin = Math.ceil(Math.min(min, max));
  const safeMax = Math.floor(Math.max(min, max));
  if (safeMin === safeMax) return safeMin;
  return Math.floor(nextFloat() * (safeMax - safeMin + 1)) + safeMin;
}

function numeric(length: number): string {
  return Array.from({ length: Math.max(0, length) }, () => String(int({ min: 0, max: 9 }))).join("");
}

function alphanumeric(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: Math.max(0, length) }, () => chars[int({ min: 0, max: chars.length - 1 })]).join("");
}

function arrayElement<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("arrayElement requires a non-empty array");
  return arr[int({ min: 0, max: arr.length - 1 })];
}

function arrayElements<T>(arr: T[], count: number): T[] {
  if (arr.length === 0 || count <= 0) return [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = int({ min: 0, max: i });
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function boolean(options?: BooleanOptions): boolean {
  const probability = options?.probability ?? 0.5;
  const safeProbability = Math.max(0, Math.min(1, probability));
  return nextFloat() < safeProbability;
}

function seed(seedValue: number): void {
  random = mulberry32(seedValue >>> 0);
}

export const faker = {
  seed,
  number: {
    int,
  },
  string: {
    numeric,
    alphanumeric,
  },
  helpers: {
    arrayElement,
    arrayElements,
  },
  datatype: {
    boolean,
  },
};
