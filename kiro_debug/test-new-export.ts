/**
 * Test script to verify the new Excel export logic
 * Tests filtering of negative values and isFutureMessage flag
 */

import { CSVWriter } from '../src/output/CSVWriter.js';
import type { JoinedRecord } from '../src/processing/types.js';
import { mkdir } from 'fs/promises';

async function testExcelExport() {
  console.log('Starting Excel export test...\n');

  // Create test data
  const mockRecords: JoinedRecord[] = [
    {
      locationCode: 'test_loc_1',
      mainType: 'outdoor',
      tp: 'PM25',
      isFutureMessage: false,
      isFutureData: false,
      measurements: [
        { k: '44', t: new Date('2024-01-01T00:00:00Z'), v: 25.5 },   // Valid
        { k: '44', t: new Date('2024-01-01T01:00:00Z'), v: -10 },    // Should skip (negative)
        { k: '44', t: new Date('2024-01-01T02:00:00Z'), v: 30.0 },   // Valid
      ]
    },
    {
      locationCode: 'test_loc_2',
      mainType: 'indoor',
      tp: 'PM25',
      isFutureMessage: true, // Should skip entire record
      isFutureData: false,
      measurements: [
        { k: '44', t: new Date('2024-01-01T03:00:00Z'), v: 20.5 },
        { k: '44', t: new Date('2024-01-01T04:00:00Z'), v: 25.0 },
      ]
    },
    {
      locationCode: 'test_loc_3',
      mainType: 'outdoor',
      tp: 'PM25',
      isFutureMessage: false,
      isFutureData: false,
      measurements: [
        { k: '44', t: new Date('2024-01-01T05:00:00Z'), v: 40.0 },   // Valid
      ]
    }
  ];

  const outputDir = './kiro_debug/test_output';
  const parameterTypes = ['44'];

  try {
    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Create writer and export
    const writer = new CSVWriter();
    const result = await writer.writeExcel(mockRecords, parameterTypes, outputDir);

    console.log('Export completed:');
    console.log(`- Files created: ${result.filesCreated}`);
    console.log(`- Rows skipped: ${result.rowsSkipped}`);
    console.log('\nExpected:');
    console.log('- Files created: 3 (one from each valid measurement)');
    console.log('- Rows skipped: 3 (one negative value + 2 from future message record)');

    // Summary
    console.log('\n✅ Test passed if:');
    console.log('  1. Files created = 3');
    console.log('  2. Rows skipped = 3');
    console.log('  3. Each Excel file has columns: "t" and "44"');
    console.log('  4. No files from test_loc_2 (isFutureMessage=true)');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

testExcelExport();
