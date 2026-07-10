import { DataTransformer } from '../../src/processing/DataTransformer.js';
import { JoinedRecord } from '../../src/processing/types.js';

describe('DataTransformer', () => {
  let transformer: DataTransformer;

  beforeEach(() => {
    transformer = new DataTransformer();
  });

  describe('formatValue', () => {
    it('should return empty string for negative values', () => {
      expect(transformer.formatValue(-1)).toBe('');
      expect(transformer.formatValue(-10.5)).toBe('');
      expect(transformer.formatValue(-0.001)).toBe('');
    });

    it('should return "0" for zero value', () => {
      expect(transformer.formatValue(0)).toBe('0');
    });

    it('should return numeric string for positive values', () => {
      expect(transformer.formatValue(23.5)).toBe('23.5');
      expect(transformer.formatValue(100)).toBe('100');
      expect(transformer.formatValue(0.001)).toBe('0.001');
    });
  });

  describe('formatTimestamp', () => {
    it('should format Date to ISO 8601 string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(transformer.formatTimestamp(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle different dates correctly', () => {
      const date1 = new Date('2023-12-31T23:59:59.999Z');
      const date2 = new Date('2024-01-01T00:00:00.000Z');
      
      expect(transformer.formatTimestamp(date1)).toBe('2023-12-31T23:59:59.999Z');
      expect(transformer.formatTimestamp(date2)).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('transformToCSVRows', () => {
    it('should transform single joined record with one measurement', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temperature_sensor',
          measurements: [
            {
              k: 'temp',
              t: new Date('2024-01-15T10:30:00.000Z'),
              v: 23.5
            }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = transformer.transformToCSVRows(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        locationCode: 'LOC001',
        mainType: 'outdoor',
        tp: 'temperature_sensor',
        k: 'temp',
        t: '2024-01-15T10:30:00.000Z',
        v: '23.5'
      });
    });

    it('should flatten multiple measurements from single record', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'weather_sensor',
          measurements: [
            {
              k: 'temp',
              t: new Date('2024-01-15T10:30:00.000Z'),
              v: 23.5
            },
            {
              k: 'humidity',
              t: new Date('2024-01-15T10:30:00.000Z'),
              v: 65.2
            }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = transformer.transformToCSVRows(records);

      expect(result).toHaveLength(2);
      expect(result[0].k).toBe('temp');
      expect(result[1].k).toBe('humidity');
    });

    it('should handle negative values by returning empty string in v column', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'sensor',
          measurements: [
            {
              k: 'temp',
              t: new Date('2024-01-15T10:30:00.000Z'),
              v: -5.5
            }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = transformer.transformToCSVRows(records);

      expect(result).toHaveLength(1);
      expect(result[0].v).toBe('');
      expect(result[0].locationCode).toBe('LOC001');
      expect(result[0].mainType).toBe('outdoor');
      expect(result[0].tp).toBe('sensor');
      expect(result[0].k).toBe('temp');
      expect(result[0].t).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should maintain correct column order', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC999',
          mainType: 'indoor',
          tp: 'air_quality',
          measurements: [
            {
              k: 'pm25',
              t: new Date('2024-01-15T10:30:00.000Z'),
              v: 15.3
            }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = transformer.transformToCSVRows(records);
      const row = result[0];
      const keys = Object.keys(row);

      expect(keys).toEqual(['locationCode', 'mainType', 'tp', 'k', 't', 'v']);
    });

    it('should handle multiple records with multiple measurements', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'sensor1',
          measurements: [
            { k: 'temp', t: new Date('2024-01-15T10:30:00.000Z'), v: 20 },
            { k: 'humidity', t: new Date('2024-01-15T10:30:00.000Z'), v: 60 }
          ],
          isFutureMessage: false,
          isFutureData: false
        },
        {
          locationCode: 'LOC002',
          mainType: 'indoor',
          tp: 'sensor2',
          measurements: [
            { k: 'pm25', t: new Date('2024-01-15T10:31:00.000Z'), v: 12.5 }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = transformer.transformToCSVRows(records);

      expect(result).toHaveLength(3);
      expect(result[0].locationCode).toBe('LOC001');
      expect(result[1].locationCode).toBe('LOC001');
      expect(result[2].locationCode).toBe('LOC002');
    });

    it('should return empty array for empty input', () => {
      const result = transformer.transformToCSVRows([]);
      expect(result).toEqual([]);
    });

    it('should handle record with no measurements', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'sensor',
          measurements: [],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = transformer.transformToCSVRows(records);
      expect(result).toEqual([]);
    });
  });

  describe('transformToWideRows', () => {
    it('should place each parameter value in its own column keyed by code', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'sensor',
          measurements: [
            { k: '44', t: new Date('2024-01-15T10:30:00.000Z'), v: 23.5 },
            { k: '20', t: new Date('2024-01-15T10:30:00.000Z'), v: 18.2 },
          ],
          isFutureMessage: false,
          isFutureData: false,
        },
      ];

      const result = transformer.transformToWideRows(records, ['44', '20']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        timestamp: '2024-01-15T10:30:00.000Z',
        '44': '23.5',
        '20': '18.2',
      });
    });

    it('should create one row per timestamp and leave absent parameters empty', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'sensor',
          measurements: [
            { k: '44', t: new Date('2024-01-15T10:30:00.000Z'), v: 23.5 },
            // second timestamp only has the '20' parameter
            { k: '20', t: new Date('2024-01-15T10:31:00.000Z'), v: 18.2 },
          ],
          isFutureMessage: false,
          isFutureData: false,
        },
      ];

      const result = transformer.transformToWideRows(records, ['44', '20']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: '2024-01-15T10:30:00.000Z',
        '44': '23.5',
        '20': '',
      });
      expect(result[1]).toEqual({
        timestamp: '2024-01-15T10:31:00.000Z',
        '44': '',
        '20': '18.2',
      });
    });

    it('should keep rows from different locations separate at the same timestamp', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'sensor',
          measurements: [{ k: '44', t: new Date('2024-01-15T10:30:00.000Z'), v: 10 }],
          isFutureMessage: false,
          isFutureData: false,
        },
        {
          locationCode: 'LOC002',
          mainType: 'outdoor',
          tp: 'sensor',
          measurements: [{ k: '44', t: new Date('2024-01-15T10:30:00.000Z'), v: 20 }],
          isFutureMessage: false,
          isFutureData: false,
        },
      ];

      const result = transformer.transformToWideRows(records, ['44']);

      expect(result).toHaveLength(2);
      expect(result[0]['44']).toBe('10.0');
      expect(result[1]['44']).toBe('20.0');
    });

    it('should represent negative values as empty strings', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'sensor',
          measurements: [{ k: '44', t: new Date('2024-01-15T10:30:00.000Z'), v: -5 }],
          isFutureMessage: false,
          isFutureData: false,
        },
      ];

      const result = transformer.transformToWideRows(records, ['44']);

      expect(result).toHaveLength(1);
      expect(result[0]['44']).toBe('');
    });

    it('should return an empty array for empty input', () => {
      expect(transformer.transformToWideRows([], ['44'])).toEqual([]);
    });
  });
});
