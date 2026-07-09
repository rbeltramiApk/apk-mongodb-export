import { JoinedRecord, FilterCriteria } from './types.js';

/**
 * DataFilter class for filtering joined records based on validity flags and parameter types
 * Validates: Requirements 5.1, 5.2, 5.3, 6.1, 6.2, 6.3
 */
export class DataFilter {
  /**
   * Filters out records with future flags set to true
   * 
   * Requirements:
   * - 5.1: WHEN isFutureMessage equals true, THE Exporter SHALL exclude the entire document from export
   * - 5.2: WHEN isFutureData equals true, THE Exporter SHALL exclude the entire document from export
   * - 5.3: THE Exporter SHALL process only documents where both Future_Flags are false
   * 
   * @param records - Array of joined records to filter
   * @returns Array of records where both isFutureMessage and isFutureData are false
   */
  filterInvalidRecords(records: JoinedRecord[]): JoinedRecord[] {
    return records.filter(record => 
      !record.isFutureMessage && !record.isFutureData
    );
  }

  /**
   * Filters measurements by parameter type and removes records with empty measurements
   * 
   * Requirements:
   * - 6.1: THE Exporter SHALL extract Measurement_Records from the dt array
   * - 6.2: FOR EACH Measurement_Record in the dt array, WHEN the k field matches a Parameter_Type 
   *        in the user-provided list, THE Exporter SHALL include the measurement in the export
   * - 6.3: FOR EACH Measurement_Record in the dt array, WHEN the k field does not match any Parameter_Type 
   *        in the user-provided list, THE Exporter SHALL exclude the measurement from the export
   * 
   * Also filters measurements by date range if provided, and removes records with empty measurements arrays after filtering
   * 
   * @param records - Array of joined records to filter
   * @param criteria - Filter criteria containing parameter types to include and optional date range
   * @returns Array of records with measurements filtered by parameter type and date range (excluding records with empty measurements)
   */
  filterMeasurementsByParameterType(
    records: JoinedRecord[],
    criteria: FilterCriteria
  ): JoinedRecord[] {
    const parameterTypesSet = new Set(criteria.parameterTypes);
    
    const filteredRecords = records.map(record => ({
      ...record,
      measurements: record.measurements.filter(measurement => {
        // Filter by parameter type
        if (!parameterTypesSet.has(measurement.k)) {
          return false;
        }
        
        // Filter by date range if provided
        if (criteria.startDate || criteria.endDate) {
          const measurementDate = new Date(measurement.t);
          
          if (criteria.startDate && measurementDate < criteria.startDate) {
            return false;
          }
          
          if (criteria.endDate && measurementDate > criteria.endDate) {
            return false;
          }
        }
        
        return true;
      })
    }));

    // Remove records with empty measurements arrays after filtering
    return filteredRecords.filter(record => record.measurements.length > 0);
  }
}
