import { TimeSeriesDocument, DeviceDocument } from '../data/types.js';
import { JoinedRecord } from './types.js';

/**
 * Result of the join operation
 */
export interface JoinResult {
  /** Successfully joined records with device metadata */
  joined: JoinedRecord[];
  
  /** Location codes that had time series data but no matching device metadata */
  missingMetadata: string[];
}

/**
 * DataJoiner combines time series data with device metadata
 * Validates: Requirements 4.4
 */
export class DataJoiner {
  /**
   * Joins time series documents with device metadata by locationCode
   * 
   * @param timeSeries - Array of time series documents from measures_m2_ts collection
   * @param devices - Array of device documents from devices collection
   * @returns Object containing joined records and list of location codes with missing metadata
   * 
   * Algorithm:
   * 1. Create a lookup map from devices array keyed by locationCode for O(1) lookup
   * 2. For each time series document, find matching device metadata
   * 3. If match found, create JoinedRecord with combined data
   * 4. If match not found, track the location code in missingMetadata list
   * 5. Return both joined records and missing metadata location codes
   */
  join(
    timeSeries: TimeSeriesDocument[],
    devices: DeviceDocument[]
  ): JoinResult {
    // Step 1: Create lookup map from devices array keyed by locationCode
    const deviceMap = new Map<string, DeviceDocument>();
    for (const device of devices) {
      deviceMap.set(device.locationCode, device);
    }

    const joined: JoinedRecord[] = [];
    const missingMetadata: string[] = [];

    // Step 2-4: Process each time series document
    for (const tsDoc of timeSeries) {
      const device = deviceMap.get(tsDoc.locationCode);

      if (device) {
        // Match found: create joined record
        const joinedRecord: JoinedRecord = {
          locationCode: tsDoc.locationCode,
          mainType: device.mainType,
          tp: device.tp,
          measurements: tsDoc.dt,
          isFutureMessage: tsDoc.isFutureMessage,
          isFutureData: tsDoc.isFutureData,
        };
        joined.push(joinedRecord);
      } else {
        // Match not found: track missing metadata
        missingMetadata.push(tsDoc.locationCode);
      }
    }

    // Step 5: Return results
    return {
      joined,
      missingMetadata,
    };
  }
}
