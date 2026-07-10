/**
 * Test script for new Excel export logic
 * Creates individual Excel files (one per row) with dynamic columns
 */

import { ExcelJS } from 'exceljs';
import { JoinedRecord } from '../src/processing/types.js';

interface ExcelExportOptions {
  parameterTypes: string[];
  outputDir: string;
}

/**
 * Transform joined records into individual Excel files
 * One file per measurement row
 * Columns: t (timestamp) + columns for each parameterType
 * 
 * Filtering rules:
 * - Skip rows where isFutureMessage = true
 * - Skip measurements where value < 0
 */
export class ExcelExporter {
  async transformToExcel(
    records: JoinedRecord[],
    options: ExcelExportOptions
  ): Promise<{ filesCreated: number; rowsSkipped: number }> {
    let filesCreated = 0;
    let rowsSkipped = 0;

    for (const record of records) {
      // Skip records with isFutureMessage = true
      if (record.isFutureMessage) {
        rowsSkipped++;
        continue;
      }

      for (const measurement of record.measurements) {
        // Skip negative values
        if (measurement.v < 0) {
          rowsSkipped++;
          continue;
        }

        // Create a new workbook for this row
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Build headers: 't' + parameterTypes
        const headers = ['t', ...options.parameterTypes];
        worksheet.columns = headers.map(header => ({
          header,
          key: header,
          width: 20
        }));

        // Add data row
        const row: Record<string, any> = {
          t: new Date(measurement.t).toISOString(),
        };

        // Add parameter values (for now just the 'k' value mapped to parameterType)
        for (const paramType of options.parameterTypes) {
          if (measurement.k === paramType) {
            row[paramType] = measurement.v;
          } else {
            row[paramType] = '';
          }
        }

        worksheet.addRow(row);

        // Generate filename based on timestamp and location
        const timestamp = new Date(measurement.t).getTime();
        const filename = `${record.locationCode}_${measurement.k}_${timestamp}.xlsx`;
        const filepath = `${options.outputDir}/${filename}`;

        await workbook.xlsx.writeFile(filepath);
        filesCreated++;
      }
    }

    return { filesCreated, rowsSkipped };
  }
}
