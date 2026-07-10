/**
 * Test script to verify Excel export with multiple parameter types
 */

import { CSVWriter } from '../src/output/CSVWriter.js';
import type { JoinedRecord } from '../src/processing/types.js';
import { mkdir } from 'fs/promises';

async function testMultipleParameterTypes() {
  console.log('Testing Excel export with multiple parameter types...\n');

  const mockRecords: JoinedRecord[] = [
    {
      locationCode: 'outdoor_sensor_1',
      mainType: 'outdoor',
      tp: 'PM25',
      isFutureMessage: false,
      isFutureData: false,
      measurements: [
        { k: '44', t: new Date('2024-01-01T00:00:00Z'), v: 25.5 },   // PM2.5
        { k: '45', t: new Date('2024-01-01T00:00:00Z'), v: 40.2 },   // PM10
        { k: '44', t: new Date('2024-01-01T01:00:00Z'), v: 30.0 },   // PM2.5
        { k: '45', t: new Date('2024-01-01T01:00:00Z'), v: -5 },     // PM10 (negative, skip)
      ]
    },
    {
      locationCode: 'indoor_sensor_2',
      mainType: 'indoor',
      tp: 'PM25',
      isFutureMessage: false,
      isFutureData: false,
      measurements: [
        { k: '44', t: new Date('2024-01-01T02:00:00Z'), v: 15.0 },   // PM2.5
        { k: '45', t: new Date('2024-01-01T02:00:00Z'), v: 22.5 },   // PM10
      ]
    }
  ];

  const outputDir = './kiro_debug/test_multi_output';
  const parameterTypes = ['44', '45'];  // PM2.5 and PM10

  try {
    await mkdir(outputDir, { recursive: true });

    const writer = new CSVWriter();
    const result = await writer.writeExcel(mockRecords, parameterTypes, outputDir);

    console.log('✅ Export completed:');
    console.log(`   Files created: ${result.filesCreated}`);
    console.log(`   Rows skipped: ${result.rowsSkipped}`);
    
    console.log('\n📊 Expected Results:');
    console.log('   Files created: 5');
    console.log('   - outdoor_sensor_1_44_*.xlsx');
    console.log('   - outdoor_sensor_1_45_*.xlsx');
    console.log('   - indoor_sensor_2_44_*.xlsx');
    console.log('   - indoor_sensor_2_45_*.xlsx');
    console.log('   Rows skipped: 1 (negative PM10 value)');

    console.log('\n📋 Each Excel file contains:');
    console.log('   Columns: "t", "44", "45"');
    console.log('   Values populated only for matching k (parameter type)');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testMultipleParameterTypes();
