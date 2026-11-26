import data from './pigments.json';
import type { Oklab } from '../color/color';

export interface Pigment {
  /** Unique, stable key. Colour Index codes are NOT unique (e.g. PBr7 covers umbers and siennas). */
  id: string;
  /** Colour Index generic name, e.g. PY3. */
  code: string;
  name: string;
  /** Masstone color. */
  oklab: Oklab;
  hex: string;
  note?: string;
  extinct?: boolean;
  fugitive?: boolean;
  hideByDefault?: boolean;
}

export interface PigmentDataset {
  source: { name: string; url: string; license: string; licenseUrl: string; note: string };
  pigments: Pigment[];
}

/** Throws a descriptive error if the data violates the dataset schema. */
export function validatePigmentDataset(input: PigmentDataset): PigmentDataset {
  const ids = new Set<string>();
  for (const p of input.pigments) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) throw new Error(`Bad pigment id: ${p.id}`);
    if (ids.has(p.id)) throw new Error(`Duplicate pigment id: ${p.id}`);
    ids.add(p.id);
    if (!p.code || !p.name) throw new Error(`Pigment ${p.id} lacks code or name`);
    if (!/^#[0-9a-f]{6}$/.test(p.hex)) throw new Error(`Pigment ${p.id}: bad hex ${p.hex}`);
    const { l, a, b } = p.oklab;
    if (![l, a, b].every(Number.isFinite) || l < 0 || l > 1) {
      throw new Error(`Pigment ${p.id}: bad OKLab value`);
    }
  }
  if (!input.source?.name || !input.source.url || !input.source.license)
    throw new Error('Dataset lacks source provenance');
  return input;
}

export const PIGMENT_DATASET: PigmentDataset = validatePigmentDataset(data as PigmentDataset);
export const PIGMENTS: readonly Pigment[] = PIGMENT_DATASET.pigments;

export function pigmentById(id: string): Pigment {
  const p = PIGMENTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown pigment: ${id}`);
  return p;
}
