/**
 * User configuration for the MongoDB CSV exporter
 * Validates: Requirements 1.1, 1.2
 */
export interface UserConfig {
  /** List of location codes to process */
  locationCodes: string[];
  
  /** List of parameter types to include in the export */
  parameterTypes: string[];
  
  /** MongoDB connection URI */
  mongoUri: string;
  
  /** Database name */
  databaseName: string;
  
  /** Output file path for the CSV */
  outputPath: string;
  
  /** Optional: Start date for time range filter (ISO 8601 format) */
  startDate?: string;
  
  /** Optional: End date for time range filter (ISO 8601 format) */
  endDate?: string;
}

/**
 * Validation result for user configuration
 */
export type ValidationResult = 
  | { valid: true }
  | { valid: false; errors: string[] };
