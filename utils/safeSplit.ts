// Safe split utility function to prevent "Cannot read properties of undefined (reading 'split')" errors

/**
 * Safely splits a string value that might be undefined or null
 * @param value - The value to split (might be undefined, null, or string)
 * @param separator - The separator to use for splitting (default: ',')
 * @param defaultValue - The default value to return if input is invalid (default: [])
 * @returns Array of split values or default value
 */
export function safeSplit(
  value: any, // Accept any type and validate internally
  separator: string = ',', 
  defaultValue: string[] = []
): string[] {
  try {
    // Handle undefined, null, or non-string values
    if (value === undefined || value === null) {
      console.debug('safeSplit: value is undefined or null, returning default');
      return defaultValue;
    }

    // Convert non-string values to string
    let stringValue: string;
    if (typeof value === 'string') {
      stringValue = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      stringValue = String(value);
    } else if (typeof value === 'object') {
      // Handle objects/arrays - try JSON stringify as last resort
      try {
        stringValue = JSON.stringify(value);
        console.warn('safeSplit: converted object to JSON string:', stringValue);
      } catch {
        console.warn('safeSplit: unable to convert object to string, returning default');
        return defaultValue;
      }
    } else {
      console.warn('safeSplit: unsupported type:', typeof value, 'returning default');
      return defaultValue;
    }

    // Trim the value and check if it's empty after trimming
    const trimmedValue = stringValue.trim();
    if (trimmedValue === '') {
      console.debug('safeSplit: empty string after trim, returning default');
      return defaultValue;
    }

    // Use regex to avoid split() - find all parts separated by the separator
    if (separator === ',') {
      // Optimized for comma separator
      const matches = trimmedValue.match(/[^,]+/g);
      if (!matches) return defaultValue;
      return matches.map(item => item.trim()).filter(item => item !== '');
    } else {
      // General case - build regex pattern for any separator
      const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = trimmedValue.match(new RegExp(`[^${escapedSeparator}]+`, 'g'));
      if (!matches) return defaultValue;
      return matches.map(item => item.trim()).filter(item => item !== '');
    }
  } catch (error) {
    console.error('safeSplit error:', error, 'for value:', value, 'type:', typeof value);
    return defaultValue;
  }
}

/**
 * Safely extracts file extension from a URI that might be undefined
 * @param uri - The URI to extract extension from
 * @param defaultExtension - Default extension if extraction fails
 * @returns File extension (without dot) or default
 */
export function safeGetExtension(uri: string | undefined | null, defaultExtension: string = 'jpg'): string {
  if (!uri || typeof uri !== 'string') {
    return defaultExtension;
  }

  try {
    // Find last dot without using split
    let lastDotIndex = -1;
    for (let i = uri.length - 1; i >= 0; i--) {
      if (uri[i] === '.') {
        lastDotIndex = i;
        break;
      }
    }
    
    if (lastDotIndex !== -1 && lastDotIndex < uri.length - 1) {
      // Extract extension manually
      let extension = '';
      for (let i = lastDotIndex + 1; i < uri.length; i++) {
        extension += uri[i];
      }
      return extension.toLowerCase();
    }
  } catch (error) {
    console.warn('safeGetExtension error:', error, 'for uri:', uri);
  }

  return defaultExtension;
}

/**
 * Safely extracts filename from a path that might be undefined
 * @param path - The path to extract filename from
 * @param defaultFilename - Default filename if extraction fails
 * @returns Filename or default
 */
export function safeGetFilename(path: string | undefined | null, defaultFilename: string = 'file'): string {
  if (!path || typeof path !== 'string') {
    return defaultFilename;
  }

  try {
    // Find last slash without using split
    let lastSlashIndex = -1;
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i] === '/' || path[i] === '\\') {
        lastSlashIndex = i;
        break;
      }
    }
    
    if (lastSlashIndex === -1) {
      // No path separators, return the whole string
      return path || defaultFilename;
    }
    
    if (lastSlashIndex < path.length - 1) {
      // Extract filename manually
      let filename = '';
      for (let i = lastSlashIndex + 1; i < path.length; i++) {
        filename += path[i];
      }
      return filename || defaultFilename;
    }
  } catch (error) {
    console.warn('safeGetFilename error:', error, 'for path:', path);
  }

  return defaultFilename;
}

/**
 * Safely handles community IDs that might come as a comma-separated string
 * @param communities - Community data that might be string or array
 * @returns Array of community IDs
 */
export function safeParseCommunities(communities: string | string[] | undefined | null): string[] {
  // If it's already an array, return it
  if (Array.isArray(communities)) {
    return communities.filter(id => id && typeof id === 'string');
  }

  // If it's a string, split it
  if (typeof communities === 'string') {
    return safeSplit(communities, ',');
  }

  // If it's undefined or null, return empty array
  return [];
}

/**
 * General safe parser for any field that might need splitting
 * @param value - Value that might need parsing/splitting
 * @param type - Expected type ('array', 'string', 'number')
 * @param separator - Separator for splitting (default: ',')
 * @returns Safely parsed value
 */
export function safeParseField(
  value: any, 
  type: 'array' | 'string' | 'number' = 'string',
  separator: string = ','
): any {
  if (value === null || value === undefined) {
    switch (type) {
      case 'array': return [];
      case 'string': return '';
      case 'number': return 0;
      default: return value;
    }
  }

  switch (type) {
    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return safeSplit(value, separator);
      return [value]; // Wrap single values in array

    case 'string':
      return String(value || '');

    case 'number':
      const num = Number(value);
      return isNaN(num) ? 0 : num;

    default:
      return value;
  }
}
