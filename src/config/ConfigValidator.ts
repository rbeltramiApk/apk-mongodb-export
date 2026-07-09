/**
 * ConfigValidator - Validates user configuration
 * Validates: Requirements 1.3, 1.4, 1.5
 */

import { UserConfig, ValidationResult } from './types.js';

export class ConfigValidator {
  /**
   * Validates user configuration
   * @param config - User configuration to validate
   * @returns ValidationResult indicating success or errors
   */
  validate(config: UserConfig): ValidationResult {
    const errors: string[] = [];

    // Validate locationCodes array is non-empty (Requirement 1.4)
    if (!config.locationCodes || config.locationCodes.length === 0) {
      errors.push('locationCodes must be a non-empty array');
    }

    // Validate parameterTypes array is non-empty (Requirement 1.5)
    if (!config.parameterTypes || config.parameterTypes.length === 0) {
      errors.push('parameterTypes must be a non-empty array');
    }

    // Validate mongoUri is provided and has valid format (Requirement 1.3)
    if (!config.mongoUri || typeof config.mongoUri !== 'string' || config.mongoUri.trim() === '') {
      errors.push('mongoUri is required and must be a non-empty string');
    } else if (!this.isValidMongoUri(config.mongoUri)) {
      errors.push('mongoUri must be a valid MongoDB connection string (should start with mongodb:// or mongodb+srv://)');
    }

    // Validate databaseName is provided
    if (!config.databaseName || typeof config.databaseName !== 'string' || config.databaseName.trim() === '') {
      errors.push('databaseName is required and must be a non-empty string');
    }

    // Validate outputPath is provided (Requirement 1.3)
    if (!config.outputPath || typeof config.outputPath !== 'string' || config.outputPath.trim() === '') {
      errors.push('outputPath is required and must be a non-empty string');
    } else if (!this.isValidOutputPath(config.outputPath)) {
      errors.push('outputPath contains invalid characters');
    }

    // Validate optional date range filters
    if (config.startDate !== undefined) {
      if (typeof config.startDate !== 'string') {
        errors.push('startDate must be a string in ISO 8601 format');
      } else if (!this.isValidISODate(config.startDate)) {
        errors.push('startDate must be a valid ISO 8601 date string (e.g., "2024-01-15T00:00:00.000Z")');
      }
    }

    if (config.endDate !== undefined) {
      if (typeof config.endDate !== 'string') {
        errors.push('endDate must be a string in ISO 8601 format');
      } else if (!this.isValidISODate(config.endDate)) {
        errors.push('endDate must be a valid ISO 8601 date string (e.g., "2024-01-15T23:59:59.999Z")');
      }
    }

    // Validate date range logic (startDate must be before endDate)
    if (config.startDate && config.endDate) {
      const start = new Date(config.startDate);
      const end = new Date(config.endDate);
      if (start >= end) {
        errors.push('startDate must be before endDate');
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Validates MongoDB connection URI format
   * @param uri - MongoDB connection string
   * @returns true if URI format is valid
   */
  private isValidMongoUri(uri: string): boolean {
    // Check for valid MongoDB connection string prefixes
    const validPrefixes = ['mongodb://', 'mongodb+srv://'];
    return validPrefixes.some(prefix => uri.startsWith(prefix));
  }

  /**
   * Validates output path for invalid characters
   * @param path - Output file path
   * @returns true if path is valid
   */
  private isValidOutputPath(path: string): boolean {
    // Check for null bytes which are invalid in file paths
    if (path.includes('\0')) {
      return false;
    }

    // Basic validation - reject control characters
    const invalidCharsRegex = /[\x00-\x1f\x7f]/;
    if (invalidCharsRegex.test(path)) {
      return false;
    }

    return true;
  }

  /**
   * Validates ISO 8601 date string format
   * @param dateStr - Date string to validate
   * @returns true if valid ISO 8601 date
   */
  private isValidISODate(dateStr: string): boolean {
    const date = new Date(dateStr);
    // Check if date is valid (not NaN) and the string representation matches
    return !isNaN(date.getTime()) && date.toISOString() === dateStr;
  }
}
