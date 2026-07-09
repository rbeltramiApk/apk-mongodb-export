/**
 * Result of export execution
 * Validates: Requirements 12.4, 12.5
 */
export interface ExportResult {
  /** Whether the export was successful */
  success: boolean;
  
  /** Number of CSV rows exported */
  rowsExported: number;
  
  /** Path to the output CSV file */
  outputPath: string;
  
  /** List of warnings encountered during export */
  warnings: string[];
  
  /** Error message if export failed */
  error?: string;
}

/**
 * Error response format
 * Validates: Requirements 13.1, 13.2, 13.3
 */
export interface ErrorResponse {
  success: false;
  error: {
    category: 'config' | 'database' | 'filesystem' | 'unknown';
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}
