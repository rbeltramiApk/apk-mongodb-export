import { DataJoiner } from '../../src/processing/DataJoiner';
import { TimeSeriesDocument, DeviceDocument } from '../../src/data/types';

describe('DataJoiner', () => {
  let dataJoiner: DataJoiner;

  beforeEach(() => {
    dataJoiner = new DataJoiner();
  });

  describe('join', () => {
    it('should join time series with matching device metadata', () => {
      // Arrange
      const timeSeries: TimeSeriesDocument[] = [
        {
          locationCode: 'LOC001',
          dt: [
            { k: 'temp', t: new Date('2024-01-15T10:30:00Z'), v: 23.5 },
            { k: 'humidity', t: new Date('2024-01-15T10:30:00Z'), v: 65.2 },
          ],
          isFutureMessage: false,
          isFutureData: false,
          tm: new Date('2024-01-15T10:30:00Z'),
        },
        {
          locationCode: 'LOC002',
          dt: [
            { k: 'pm25', t: new Date('2024-01-15T10:31:00Z'), v: 12.3 },
          ],
          isFutureMessage: false,
          isFutureData: false,
          tm: new Date('2024-01-15T10:31:00Z'),
        },
      ];

      const devices: DeviceDocument[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temperature_sensor',
        },
        {
          locationCode: 'LOC002',
          mainType: 'indoor',
          tp: 'air_quality_sensor',
        },
      ];

      // Act
      const result = dataJoiner.join(timeSeries, devices);

      // Assert
      expect(result.joined).toHaveLength(2);
      expect(result.missingMetadata).toHaveLength(0);

      // Verify first joined record
      expect(result.joined[0]).toEqual({
        locationCode: 'LOC001',
        mainType: 'outdoor',
        tp: 'temperature_sensor',
        measurements: timeSeries[0].dt,
        isFutureMessage: false,
        isFutureData: false,
      });

      // Verify second joined record
      expect(result.joined[1]).toEqual({
        locationCode: 'LOC002',
        mainType: 'indoor',
        tp: 'air_quality_sensor',
        measurements: timeSeries[1].dt,
        isFutureMessage: false,
        isFutureData: false,
      });
    });

    it('should track location codes with missing device metadata', () => {
      // Arrange
      const timeSeries: TimeSeriesDocument[] = [
        {
          locationCode: 'LOC001',
          dt: [{ k: 'temp', t: new Date('2024-01-15T10:30:00Z'), v: 23.5 }],
          isFutureMessage: false,
          isFutureData: false,
          tm: new Date('2024-01-15T10:30:00Z'),
        },
        {
          locationCode: 'LOC003',
          dt: [{ k: 'humidity', t: new Date('2024-01-15T10:31:00Z'), v: 65.2 }],
          isFutureMessage: false,
          isFutureData: false,
          tm: new Date('2024-01-15T10:31:00Z'),
        },
      ];

      const devices: DeviceDocument[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temperature_sensor',
        },
        // LOC003 is missing from devices
      ];

      // Act
      const result = dataJoiner.join(timeSeries, devices);

      // Assert
      expect(result.joined).toHaveLength(1);
      expect(result.missingMetadata).toHaveLength(1);
      expect(result.missingMetadata).toContain('LOC003');
      expect(result.joined[0].locationCode).toBe('LOC001');
    });

    it('should return all location codes as missing when device array is empty', () => {
      // Arrange
      const timeSeries: TimeSeriesDocument[] = [
        {
          locationCode: 'LOC001',
          dt: [{ k: 'temp', t: new Date('2024-01-15T10:30:00Z'), v: 23.5 }],
          isFutureMessage: false,
          isFutureData: false,
          tm: new Date('2024-01-15T10:30:00Z'),
        },
        {
          locationCode: 'LOC002',
          dt: [{ k: 'humidity', t: new Date('2024-01-15T10:31:00Z'), v: 65.2 }],
          isFutureMessage: false,
          isFutureData: false,
          tm: new Date('2024-01-15T10:31:00Z'),
        },
      ];

      const devices: DeviceDocument[] = [];

      // Act
      const result = dataJoiner.join(timeSeries, devices);

      // Assert
      expect(result.joined).toHaveLength(0);
      expect(result.missingMetadata).toHaveLength(2);
      expect(result.missingMetadata).toContain('LOC001');
      expect(result.missingMetadata).toContain('LOC002');
    });

    it('should handle empty time series array', () => {
      // Arrange
      const timeSeries: TimeSeriesDocument[] = [];
      const devices: DeviceDocument[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temperature_sensor',
        },
      ];

      // Act
      const result = dataJoiner.join(timeSeries, devices);

      // Assert
      expect(result.joined).toHaveLength(0);
      expect(result.missingMetadata).toHaveLength(0);
    });

    it('should handle empty arrays for both time series and devices', () => {
      // Arrange
      const timeSeries: TimeSeriesDocument[] = [];
      const devices: DeviceDocument[] = [];

      // Act
      const result = dataJoiner.join(timeSeries, devices);

      // Assert
      expect(result.joined).toHaveLength(0);
      expect(result.missingMetadata).toHaveLength(0);
    });

    it('should preserve future flag values in joined records', () => {
      // Arrange
      const timeSeries: TimeSeriesDocument[] = [
        {
          locationCode: 'LOC001',
          dt: [{ k: 'temp', t: new Date('2024-01-15T10:30:00Z'), v: 23.5 }],
          isFutureMessage: true,
          isFutureData: false,
          tm: new Date('2024-01-15T10:30:00Z'),
        },
        {
          locationCode: 'LOC002',
          dt: [{ k: 'humidity', t: new Date('2024-01-15T10:31:00Z'), v: 65.2 }],
          isFutureMessage: false,
          isFutureData: true,
          tm: new Date('2024-01-15T10:31:00Z'),
        },
      ];

      const devices: DeviceDocument[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temperature_sensor',
        },
        {
          locationCode: 'LOC002',
          mainType: 'indoor',
          tp: 'air_quality_sensor',
        },
      ];

      // Act
      const result = dataJoiner.join(timeSeries, devices);

      // Assert
      expect(result.joined).toHaveLength(2);
      expect(result.joined[0].isFutureMessage).toBe(true);
      expect(result.joined[0].isFutureData).toBe(false);
      expect(result.joined[1].isFutureMessage).toBe(false);
      expect(result.joined[1].isFutureData).toBe(true);
    });

    it('should handle multiple time series documents with the same location code', () => {
      // Arrange
      const timeSeries: TimeSeriesDocument[] = [
        {
          locationCode: 'LOC001',
          dt: [{ k: 'temp', t: new Date('2024-01-15T10:30:00Z'), v: 23.5 }],
          isFutureMessage: false,
          isFutureData: false,
          tm: new Date('2024-01-15T10:30:00Z'),
        },
        {
          locationCode: 'LOC001',
          dt: [{ k: 'humidity', t: new Date('2024-01-15T10:31:00Z'), v: 65.2 }],
          isFutureMessage: false,
          isFutureData: false,
          tm: new Date('2024-01-15T10:31:00Z'),
        },
      ];

      const devices: DeviceDocument[] = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temperature_sensor',
        },
      ];

      // Act
      const result = dataJoiner.join(timeSeries, devices);

      // Assert
      expect(result.joined).toHaveLength(2);
      expect(result.missingMetadata).toHaveLength(0);
      expect(result.joined[0].locationCode).toBe('LOC001');
      expect(result.joined[1].locationCode).toBe('LOC001');
      expect(result.joined[0].mainType).toBe('outdoor');
      expect(result.joined[1].mainType).toBe('outdoor');
    });
  });
});
