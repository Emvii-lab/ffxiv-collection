import { describe, it, expect } from 'vitest';
import { isTooClose, formatNumber, formatCurrency } from './utils.js';

describe('isTooClose', () => {
    it('returns false when there are no existing positions', () => {
        expect(isTooClose(10, 10, null)).toBe(false);
        expect(isTooClose(10, 10, [])).toBe(false);
    });

    it('detects a point closer than the minimum distance', () => {
        expect(isTooClose(10, 10, [{ x: 11, y: 11 }], 8)).toBe(true);
    });

    it('allows a point beyond the minimum distance', () => {
        expect(isTooClose(10, 10, [{ x: 50, y: 50 }], 8)).toBe(false);
    });
});

describe('formatNumber', () => {
    it('returns empty string for null/undefined', () => {
        expect(formatNumber(null)).toBe('');
        expect(formatNumber(undefined)).toBe('');
    });

    it('formats with fr-FR grouping', () => {
        // fr-FR uses a narrow no-break space as the thousands separator
        expect(formatNumber(1234)).toMatch(/1.234/);
    });
});

describe('formatCurrency', () => {
    it('returns empty string for null/undefined', () => {
        expect(formatCurrency(null)).toBe('');
    });

    it('always shows two decimals', () => {
        expect(formatCurrency(5)).toMatch(/5,00/);
    });
});
