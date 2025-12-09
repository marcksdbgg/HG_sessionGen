export function slugify(text: string): string {
  if (!text) return 'untitled';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeTitle(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:]$/g, ''); // Remove trailing punctuation
}

export function fuzzyMatchImage(
    ref: string, 
    images: { title: string; id: string }[] | undefined
): { title: string; id: string } | undefined {
    if (!images || images.length === 0) return undefined;
    
    const normRef = normalizeTitle(ref);
    if (!normRef) return undefined;
    
    // 1. Exact match (normalized)
    const exact = images.find(img => normalizeTitle(img.title) === normRef);
    if (exact) return exact;

    // 2. Fuzzy match (contains)
    const fuzzy = images.find(img => {
        const normImg = normalizeTitle(img.title);
        return normImg && (normImg.includes(normRef) || normRef.includes(normImg));
    });
    
    return fuzzy;
}
