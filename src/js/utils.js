export function isTooClose(x, y, existingPositions, minDistance = 8) {
    if (!existingPositions) return false;
    for (const pos of existingPositions) {
        const dx = x - pos.x;
        const dy = (y - pos.y) * 0.56;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) return true;
    }
    return false;
}

export function formatNumber(num) {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('fr-FR');
}

export function formatCurrency(num) {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
