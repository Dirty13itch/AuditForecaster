import createDOMPurify from 'isomorphic-dompurify';

const DOMPurify = createDOMPurify();

// Sanitize HTML content to prevent XSS
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: []
  });
}

// Sanitize text input (handles strings and numbers properly)
export function sanitizeText(input: string | number | undefined | null): string {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return '';
  }
  
  // Handle numbers - convert to string without sanitizing
  if (typeof input === 'number') {
    return String(input);
  }
  
  // Handle empty strings
  if (input === '') {
    return '';
  }
  
  // Sanitize string input
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

// File upload validation
export const FILE_UPLOAD_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf']
};

export function validateFileUpload(file: { 
  mimetype: string; 
  size: number; 
  originalname: string;
}): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > FILE_UPLOAD_LIMITS.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${FILE_UPLOAD_LIMITS.maxSize / 1024 / 1024}MB`
    };
  }

  // Check MIME type
  if (!FILE_UPLOAD_LIMITS.allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file type. Only images (JPG, PNG, WEBP) and PDFs allowed'
    };
  }

  // Check file extension
  const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !FILE_UPLOAD_LIMITS.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: 'Invalid file extension'
    };
  }

  return { valid: true };
}
