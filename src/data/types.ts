/**
 * Single measurement record from MongoDB time series collection
 * Validates: Requirements 3.3
 */
export interface MeasurementRecord {
  /** Parameter type (e.g., "temp", "humidity", "pm25") */
  k: string;
  
  /** Timestamp of the measurement */
  t: Date;
  
  /** Measurement value */
  v: number;
}

/**
 * Time series document from measures_m2_ts collection
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export interface TimeSeriesDocument {
  /** Location code (unique identifier for a sensor device) */
  locationCode: string;
  
  /** Array of measurement records */
  dt: MeasurementRecord[];
  
  /** Future message flag - marks invalid data to be excluded */
  isFutureMessage: boolean;
  
  /** Future data flag - marks invalid data to be excluded */
  isFutureData: boolean;
  
  /** Document timestamp */
  tm: Date;
}

/**
 * Device metadata document from devices collection
 * Validates: Requirements 4.1, 4.2, 4.3
 */
export interface DeviceDocument {
  /** Location code (unique identifier for a sensor device) */
  locationCode: string;
  
  /** Device classification (e.g., "outdoor", "indoor") */
  mainType: string;
  
  /** Sensor type */
  tp: string;
}
