import { JoinedRecord } from './types.js';
import { CSVRow, WideRow } from '../output/types.js';

/**
 * DataTransformer transforms joined records into CSV row format
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2, 8.3, 8.4
 */
export class DataTransformer {
  /**
   * Transform joined records into CSV rows
   * Flattens joined records into individual CSV rows (one per measurement)
   * Ensures column order: locationCode, mainType, tp, k, t, v
   * 
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
   * 
   * @param records - Array of joined records to transform
   * @returns Array of CSV rows
   */
  transformToCSVRows(records: JoinedRecord[]): CSVRow[] {
    const csvRows: CSVRow[] = [];
    
    for (const record of records) {
      for (const measurement of record.measurements) {
        csvRows.push({
          locationCode: record.locationCode,
          mainType: record.mainType,
          tp: record.tp,
          k: measurement.k,
          t: this.formatTimestamp(measurement.t),
          v: this.formatValue(measurement.v)
        });
      }
    }
    
    return csvRows;
  }

  /**
   * Pivot joined records into wide-format rows: one row per (locationCode, timestamp),
   * with one column per requested parameter code.
   *
   * Each measurement's value is placed in the column matching its parameter code (`k`).
   * Parameter codes with no measurement at a given timestamp are left as empty strings.
   * Values are formatted via formatValue (negative values become empty strings).
   *
   * Rows are keyed by location + timestamp so that data from different sensors is never
   * merged into the same row. Insertion order is preserved.
   *
   * @param records - Array of joined records to pivot
   * @param parameterTypes - Ordered list of parameter codes that become columns
   * @returns Array of wide-format rows
   */
  transformToWideRows(records: JoinedRecord[], parameterTypes: string[]): WideRow[] {
    const rowMap = new Map<string, WideRow>();
    const order: string[] = [];

    for (const record of records) {
      for (const measurement of record.measurements) {
        const timestamp = this.formatTimestamp(measurement.t);
        // Composite key keeps different sensors separate even at identical timestamps.
        const key = `${record.locationCode}\u0000${timestamp}`;

        let row = rowMap.get(key);
        if (!row) {
          row = { timestamp };
          for (const parameterType of parameterTypes) {
            row[parameterType] = '';
          }
          rowMap.set(key, row);
          order.push(key);
        }

        // Only populate columns for requested parameter types.
        if (parameterTypes.includes(measurement.k)) {
          row[measurement.k] = this.formatValue(measurement.v);
        }
      }
    }

    return order.map((key) => rowMap.get(key)!);
  }

  /**
   * Format measurement value for CSV output
   * Returns empty string for negative values, otherwise string representation of number
   * For integers, formats with one decimal place (e.g., 8 becomes 8.0)
   * 
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4
   * 
   * @param value - Numeric measurement value
   * @returns Empty string if value is negative, otherwise string representation of value
   */
  formatValue(value: number): string {
    if (value < 0) {
      return '';
    }
    // If value is an integer, format with one decimal place
    if (Number.isInteger(value)) {
      return value.toFixed(1);
    }
    return value.toString();
  }

  /**
   * Format Date object to ISO 8601 string
   * 
   * Validates: Requirements 7.6
   * 
   * @param date - Date object to format
   * @returns ISO 8601 formatted timestamp string
   */
  formatTimestamp(date: Date): string {
    return date.toISOString();
  }
}
