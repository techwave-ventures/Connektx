// utils/safeStringUtils.ts
// Safe string utilities to prevent runtime errors

export function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return '';
  }
}

// NO split operations - using regex and string methods only
export function safeParseCommaSeparated(str: any): string[] {
  try {
    const safeStr = safeString(str);
    if (!safeStr || !safeStr.trim()) return [];
    
    // Use regex to find comma-separated values, avoiding split entirely
    const matches = safeStr.match(/[^,]+/g);
    if (!matches) return [];
    
    return matches
      .map(item => item.trim())
      .filter(item => item.length > 0);
  } catch {
    return [];
  }
}

export function safeSubstring(str: any, start: number, end?: number): string {
  try {
    const safeStr = safeString(str);
    if (!safeStr) return '';
    if (start < 0) start = 0;
    if (start >= safeStr.length) return '';
    
    const endIndex = end !== undefined ? Math.min(end, safeStr.length) : safeStr.length;
    if (endIndex <= start) return '';
    
    let result = '';
    for (let i = start; i < endIndex; i++) {
      result += safeStr[i];
    }
    return result;
  } catch {
    return '';
  }
}

export function safeDateString(value: any): string {
  try {
    if (!value) return '';
    const str = safeString(value);
    if (str.length < 10) return str;
    
    // Extract first 10 characters without using substring
    let result = '';
    for (let i = 0; i < 10 && i < str.length; i++) {
      result += str[i];
    }
    return result;
  } catch {
    return '';
  }
}

export function safeYear(value: any): string {
  try {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear().toString();
  } catch {
    return '';
  }
}

export function safeArray(value: any): any[] {
  try {
    if (Array.isArray(value)) return value;
    return [];
  } catch {
    return [];
  }
}

export function safeNumber(value: any): number {
  try {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  } catch {
    return 0;
  }
}

export function getFileExtension(uri: string): string {
  try {
    if (!uri || typeof uri !== 'string') return 'jpg';
    
    // Find last dot without using split
    let lastDotIndex = -1;
    for (let i = uri.length - 1; i >= 0; i--) {
      if (uri[i] === '.') {
        lastDotIndex = i;
        break;
      }
    }
    
    if (lastDotIndex === -1 || lastDotIndex === uri.length - 1) return 'jpg';
    
    // Extract extension without split
    let extension = '';
    for (let i = lastDotIndex + 1; i < uri.length; i++) {
      extension += uri[i];
    }
    
    return extension.toLowerCase() || 'jpg';
  } catch {
    return 'jpg';
  }
}

export function getFileName(uri: string): string {
  try {
    if (!uri || typeof uri !== 'string') return `file_${Date.now()}.jpg`;
    
    // Find last slash without using split
    let lastSlashIndex = -1;
    for (let i = uri.length - 1; i >= 0; i--) {
      if (uri[i] === '/' || uri[i] === '\\') {
        lastSlashIndex = i;
        break;
      }
    }
    
    if (lastSlashIndex === -1) return uri; // No path separators found
    if (lastSlashIndex === uri.length - 1) return `file_${Date.now()}.jpg`; // Ends with slash
    
    // Extract filename without split
    let filename = '';
    for (let i = lastSlashIndex + 1; i < uri.length; i++) {
      filename += uri[i];
    }
    
    return filename || `file_${Date.now()}.jpg`;
  } catch {
    return `file_${Date.now()}.jpg`;
  }
}

export function parseTagsFromString(tagsString: any): string[] {
  try {
    if (!tagsString) return [];
    const str = safeString(tagsString);
    if (!str.trim()) return [];
    
    return safeParseCommaSeparated(str);
  } catch {
    return [];
  }
}

export function safeDateToday(): string {
  try {
    const isoString = new Date().toISOString();
    return safeDateString(isoString);
  } catch {
    try {
      // Fallback: construct date string manually
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }
}
