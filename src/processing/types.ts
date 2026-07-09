import { MeasurementRecord } from '../data/types.js';

/**
 * Joined record combining time series data with device metadata
 * Validates: Requirements 4.4
 */
export interface JoinedRecord {
  /** Location code from both time series and device */
  locationCode: string;
  
  /** Device classification from device metadata */
  mainType: string;
  
  /** Sensor type from device metadata */
  tp: string;
  
  /** Array of measurement records from time series */
  measurements: MeasurementRecord[];
  
  /** Future message flag from time series */
  isFutureMessage: boolean;
  
  /** Future data flag from time series */
  isFutureData: boolean;
}

/**
 * Filter criteria for measurements
 * Validates: Requirements 6.1, 6.2, 6.3
 */
export interface FilterCriteria {
  /** List of parameter types to include */
  parameterTypes: string[];
  
  /** Optional: Start date for time range filter */
  startDate?: Date;
  
  /** Optional: End date for time range filter */
  endDate?: Date;
}
