import { describe, it, expect } from 'vitest';
import { escapeHtml, getPatchInfo, matchesFilters } from './collection-utils.js';

describe('escapeHtml', () => {
    it('returns empty string for null/undefined', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('escapes HTML-significant characters', () => {
        expect(escapeHtml('<script>alert("x")</script>')).toBe(
            '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
        );
        expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#39;s');
    });

    it('coerces non-strings', () => {
        expect(escapeHtml(42)).toBe('42');
    });
});

describe('getPatchInfo', () => {
    it('reads version from a joined patches object', () => {
        expect(getPatchInfo({ patches: { version: '7.4' } })).toMatchObject({
            version: '7.4',
            major: '7',
        });
    });

    it('reads version from a patches array', () => {
        expect(getPatchInfo({ patches: [{ version: '6.1' }] })).toMatchObject({
            version: '6.1',
            major: '6',
        });
    });

    it('falls back to patch_id when no patches', () => {
        expect(getPatchInfo({ patch_id: '5.0' })).toMatchObject({ version: '5.0', major: '5' });
    });

    it('defaults to "?" / "2" when nothing is available', () => {
        expect(getPatchInfo({})).toMatchObject({ version: '?', major: '2', patchData: null });
    });
});

describe('matchesFilters', () => {
    const collection = new Set([1, 2]);
    const item = { id: 1, name: 'Chocobo Doré', patches: { version: '7.4' } };

    it('returns true with no active filters', () => {
        expect(
            matchesFilters(item, { collection: null, patch: null, search: '' }, collection)
        ).toBe(true);
    });

    it('filters by collected', () => {
        expect(matchesFilters({ id: 1 }, { collection: 'collected' }, collection)).toBe(true);
        expect(matchesFilters({ id: 9 }, { collection: 'collected' }, collection)).toBe(false);
    });

    it('filters by missing', () => {
        expect(matchesFilters({ id: 9 }, { collection: 'missing' }, collection)).toBe(true);
        expect(matchesFilters({ id: 1 }, { collection: 'missing' }, collection)).toBe(false);
    });

    it('filters by patch prefix', () => {
        expect(matchesFilters(item, { patch: '7' }, collection)).toBe(true);
        expect(matchesFilters(item, { patch: '6' }, collection)).toBe(false);
    });

    it('filters by case-insensitive search', () => {
        expect(matchesFilters(item, { search: 'doré' }, collection)).toBe(true);
        expect(matchesFilters(item, { search: 'xyz' }, collection)).toBe(false);
    });

    it('combines filters (all must pass)', () => {
        expect(
            matchesFilters(item, { collection: 'collected', patch: '7', search: 'cho' }, collection)
        ).toBe(true);
        expect(
            matchesFilters(item, { collection: 'collected', patch: '6', search: 'cho' }, collection)
        ).toBe(false);
    });
});
