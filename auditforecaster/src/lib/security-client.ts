import DOMPurify from 'isomorphic-dompurify';

const SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'li', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
};

export function sanitizeInput(input: string): string {
    if (!input) return input;
    return DOMPurify.sanitize(input, SANITIZE_CONFIG);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const cleanObj = { ...obj };
    for (const key in cleanObj) {
        if (typeof cleanObj[key] === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cleanObj[key] = sanitizeInput(cleanObj[key] as string) as any;
        } else if (typeof cleanObj[key] === 'object' && cleanObj[key] !== null) {
            cleanObj[key] = sanitizeObject(cleanObj[key]);
        }
    }
    return cleanObj;
}
