import { DataFilter } from '../../src/processing/DataFilter';
import { JoinedRecord, FilterCriteria } from '../../src/processing/types';

describe('DataFilter', () => {
  let dataFilter: DataFilter;

  beforeEach(() => {
    dataFilter = new DataFilter();
  });

  describe('filterInvalidRecords', () => {
    it('should exclude records where isFutureMessage is true', () => {
      // Requirement 5.1: WHEN isFutureMessage equals true, THE Exporter SHALL exclude the entire document
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [{ k: 'temp', t: new Date(), v: 23.5 }],
          isFutureMessage: true,
          isFutureData: false
        },
        {
          locationCode: 'LOC002',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [{ k: 'temp', t: new Date(), v: 24.0 }],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = dataFilter.filterInvalidRecords(records);

      expect(result).toHaveLength(1);
      expect(result[0].locationCode).toBe('LOC002');
    });

    it('should exclude records where isFutureData is true', () => {
      // Requirement 5.2: WHEN isFutureData equals true, THE Exporter SHALL exclude the entire document
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [{ k: 'temp', t: new Date(), v: 23.5 }],
          isFutureMessage: false,
          isFutureData: true
        },
        {
          locationCode: 'LOC002',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [{ k: 'temp', t: new Date(), v: 24.0 }],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = dataFilter.filterInvalidRecords(records);

      expect(result).toHaveLength(1);
      expect(result[0].locationCode).toBe('LOC002');
    });

    it('should only include records where both flags are false', () => {
      // Requirement 5.3: THE Exporter SHALL process only documents where both Future_Flags are false
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [{ k: 'temp', t: new Date(), v: 23.5 }],
          isFutureMessage: true,
          isFutureData: true
        },
        {
          locationCode: 'LOC002',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [{ k: 'temp', t: new Date(), v: 24.0 }],
          isFutureMessage: true,
          isFutureData: false
        },
        {
          locationCode: 'LOC003',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [{ k: 'temp', t: new Date(), v: 25.0 }],
          isFutureMessage: false,
          isFutureData: true
        },
        {
          locationCode: 'LOC004',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [{ k: 'temp', t: new Date(), v: 26.0 }],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const result = dataFilter.filterInvalidRecords(records);

      expect(result).toHaveLength(1);
      expect(result[0].locationCode).toBe('LOC004');
    });
  });

  describe('filterMeasurementsByParameterType', () => {
    it('should include measurements matching parameter types', () => {
      // Requirement 6.2: FOR EACH Measurement_Record, WHEN k matches a Parameter_Type, include it
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'multi_sensor',
          measurements: [
            { k: 'temp', t: new Date(), v: 23.5 },
            { k: 'humidity', t: new Date(), v: 65.2 },
            { k: 'pm25', t: new Date(), v: 12.3 }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const criteria: FilterCriteria = {
        parameterTypes: ['temp', 'humidity']
      };

      const result = dataFilter.filterMeasurementsByParameterType(records, criteria);

      expect(result).toHaveLength(1);
      expect(result[0].measurements).toHaveLength(2);
      expect(result[0].measurements[0].k).toBe('temp');
      expect(result[0].measurements[1].k).toBe('humidity');
    });

    it('should exclude measurements not matching parameter types', () => {
      // Requirement 6.3: FOR EACH Measurement_Record, WHEN k does not match any Parameter_Type, exclude it
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'multi_sensor',
          measurements: [
            { k: 'temp', t: new Date(), v: 23.5 },
            { k: 'humidity', t: new Date(), v: 65.2 },
            { k: 'pm25', t: new Date(), v: 12.3 }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const criteria: FilterCriteria = {
        parameterTypes: ['pm25']
      };

      const result = dataFilter.filterMeasurementsByParameterType(records, criteria);

      expect(result).toHaveLength(1);
      expect(result[0].measurements).toHaveLength(1);
      expect(result[0].measurements[0].k).toBe('pm25');
    });

    it('should remove records with empty measurements array after filtering', () => {
      // Task requirement: Remove records with empty measurements arrays after filtering
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [
            { k: 'pm25', t: new Date(), v: 12.3 }
          ],
          isFutureMessage: false,
          isFutureData: false
        },
        {
          locationCode: 'LOC002',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [
            { k: 'temp', t: new Date(), v: 23.5 }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const criteria: FilterCriteria = {
        parameterTypes: ['temp']
      };

      const result = dataFilter.filterMeasurementsByParameterType(records, criteria);

      // Only LOC002 should remain as LOC001 has no matching measurements
      expect(result).toHaveLength(1);
      expect(result[0].locationCode).toBe('LOC002');
    });

    it('should handle multiple records with mixed parameter types', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'multi_sensor',
          measurements: [
            { k: 'temp', t: new Date(), v: 23.5 },
            { k: 'humidity', t: new Date(), v: 65.2 }
          ],
          isFutureMessage: false,
          isFutureData: false
        },
        {
          locationCode: 'LOC002',
          mainType: 'indoor',
          tp: 'air_quality',
          measurements: [
            { k: 'pm25', t: new Date(), v: 12.3 },
            { k: 'co2', t: new Date(), v: 450 }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const criteria: FilterCriteria = {
        parameterTypes: ['temp', 'pm25']
      };

      const result = dataFilter.filterMeasurementsByParameterType(records, criteria);

      expect(result).toHaveLength(2);
      expect(result[0].measurements).toHaveLength(1);
      expect(result[0].measurements[0].k).toBe('temp');
      expect(result[1].measurements).toHaveLength(1);
      expect(result[1].measurements[0].k).toBe('pm25');
    });

    it('should return empty array when no measurements match parameter types', () => {
      const records: JoinedRecord[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temp_sensor',
          measurements: [
            { k: 'humidity', t: new Date(), v: 65.2 }
          ],
          isFutureMessage: false,
          isFutureData: false
        }
      ];

      const criteria: FilterCriteria = {
        parameterTypes: ['temp', 'pm25']
      };

      const result = dataFilter.filterMeasurementsByParameterType(records, criteria);

      expect(result).toHaveLength(0);
    });
  });
});
