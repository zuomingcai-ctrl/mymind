import { describe, it, expect } from 'vitest';
import {
  STRUCTURE_VARIANTS,
  getVariantsForStructure,
  getStructureVariant,
  matchStructureVariant,
  createDocumentWithVariant,
} from '../variants.js';
import { createSheet } from '../../model/factory.js';

describe('structure variants', () => {
  it('defines variants for all nine structure types', () => {
    const types = new Set(STRUCTURE_VARIANTS.map((v) => v.structure));
    expect(types.size).toBe(9);
    expect(getVariantsForStructure('mindmap').length).toBeGreaterThanOrEqual(9);
    expect(getVariantsForStructure('logic-chart').length).toBe(9);
  });

  it('getStructureVariant returns known variant', () => {
    const v = getStructureVariant('mindmap-balanced-classic');
    expect(v?.structure).toBe('mindmap');
  });

  it('matchStructureVariant finds default mindmap variant', () => {
    const sheet = createSheet();
    expect(matchStructureVariant(sheet)).toBe('mindmap-right-curve');
  });

  it('createDocumentWithVariant applies hand-drawn settings', () => {
    const doc = createDocumentWithVariant('mindmap-balanced-hand');
    const sheet = doc.sheets[0]!;
    expect(sheet.canvasSettings.handDrawn).toBe(true);
    expect(sheet.canvasSettings.themeId).toBe('hand-drawn');
  });
});
