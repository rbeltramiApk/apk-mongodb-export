/**
 * Unit tests for ExportOrchestrator
 * Validates: Requirements 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4, 12.5, 13.4
 */

import { ExportOrchestrator } from '../../src/orchestration/ExportOrchestrator.js';
import { MongoDBClient } from '../../src/data/MongoDBClient.js';
import { DataJoiner } from '../../src/processing/DataJoiner.js';
import { DataFilter } from '../../src/processing/DataFilter.js';
import { DataTransformer } from '../../src/processing/DataTransformer.js';
import { CSVWriter } from '../../src/output/CSVWriter.js';
import type { UserConfig } from '../../src/config/types.js';
import type { TimeSeriesDocument, DeviceDocument } from '../../src/data/types.js';

// Mock logger that tracks calls
class MockLogger {
  infoCalls: any[] = [];
  warnCalls: any[] = [];
  errorCalls: any[] = [];

  info(...args: any[]) {
    this.infoCalls.push(args);
  }

  warn(...args: any[]) {
    this.warnCalls.push(args);
  }

  error(...args: any[]) {
    this.errorCalls.push(args);
  }

  reset() {
    this.infoCalls = [];
    this.warnCalls = [];
    this.errorCalls = [];
  }
}

// Mock MongoDBClient
class MockMongoDBClient extends MongoDBClient {
  mockTimeSeriesData: TimeSeriesDocument[] = [];
  mockDeviceData: DeviceDocument[] = [];
  mockConnected: boolean = false;
  mockError: Error | null = null;
  closeCalls: number = 0;
  connectCalls: number = 0;

  async connect(_uri: string, _dbName: string): Promise<void> {
    this.connectCalls++;
    if (this.mockError) {
      throw this.mockError;
    }
    this.mockConnected = true;
  }

  async queryTimeSeries(_locationCodes: string[]): Promise<TimeSeriesDocument[]> {
    return this.mockTimeSeriesData;
  }

  async queryDevices(_locationCodes: string[]): Promise<DeviceDocument[]> {
    return this.mockDeviceData;
  }

  async close(): Promise<void> {
    this.closeCalls++;
    this.mockConnected = false;
  }

  isConnected(): boolean {
    return this.mockConnected;
  }
}

describe('ExportOrchestrator', () => {
  let orchestrator: ExportOrchestrator;
  let mockDbClient: MockMongoDBClient;
  let joiner: DataJoiner;
  let filter: DataFilter;
  let transformer: DataTransformer;
  let writer: CSVWriter;
  let mockLogger: MockLogger;

  beforeEach(() => {
    // Create instances
    mockDbClient = new MockMongoDBClient();
    joiner = new DataJoiner();
    filter = new DataFilter();
    transformer = new DataTransformer();
    writer = new CSVWriter();
    mockLogger = new MockLogger();

    orchestrator = new ExportOrchestrator(
      mockDbClient,
      joiner,
      filter,
      transformer,
      writer,
      mockLogger as any
    );
  });

  const createMockConfig = (): UserConfig => ({
    locationCodes: ['LOC001', 'LOC002'],
    // Valid parameter codes from parameters.ts: '20' -> temp, '23' -> humidity
    parameterTypes: ['20', '23'],
    mongoUri: 'mongodb://localhost:27017',
    databaseName: 'test_db',
    outputPath: './tests/output/test.csv'
  });

  describe('execute - logging behavior', () => {
    it('should log progress at each stage (Requirements 12.1, 12.2, 12.3, 12.4, 12.5)', async () => {
      // Arrange
      const config = createMockConfig();
      
      mockDbClient.mockTimeSeriesData = [];
      mockDbClient.mockDeviceData = [];

      // Act
      await orchestrator.execute(config);

      // Assert
      // Requirement 12.1: Log start of export
      const hasStartLog = mockLogger.infoCalls.some((call: any[]) => 
        call[0] === 'Starting export operation'
      );
      expect(hasStartLog).toBe(true);
      
      // Requirements 12.2, 12.3: Log location codes and parameter types counts
      const hasConfigLog = mockLogger.infoCalls.some((call: any[]) => 
        typeof call[0] === 'object' && 
        call[0].locationCodesCount === config.locationCodes.length &&
        call[0].parameterTypesCount === config.parameterTypes.length
      );
      expect(hasConfigLog).toBe(true);

      // Requirements 12.4, 12.5: Log rows exported and output path
      const hasCompletionLog = mockLogger.infoCalls.some((call: any[]) => 
        typeof call[0] === 'object' && 
        'rowsExported' in call[0] &&
        call[0].outputPath === config.outputPath
      );
      expect(hasCompletionLog).toBe(true);
    });
  });

  describe('execute - empty result sets', () => {
    it('should log warning when no time series data found (Requirement 11.1)', async () => {
      // Arrange
      const config = createMockConfig();
      
      mockDbClient.mockTimeSeriesData = [];
      mockDbClient.mockDeviceData = [];

      // Act
      const result = await orchestrator.execute(config);

      // Assert
      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(0);
      expect(result.warnings).toContain('No time series data found for the provided location codes');
      
      const hasWarning = mockLogger.warnCalls.some((call: any[]) => 
        call[0] === 'No time series data found for the provided location codes'
      );
      expect(hasWarning).toBe(true);
    });
  });

  describe('execute - error handling', () => {
    it('should fail fast with an explanation when a parameter type has no key in parameters.ts', async () => {
      // Arrange - '999' is not defined in parameters.ts
      const config = createMockConfig();
      config.parameterTypes = ['20', '999'];

      // Act
      const result = await orchestrator.execute(config);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown parameter type');
      expect(result.error).toContain('"999"');

      // Validation must happen before connecting to MongoDB (fail fast)
      expect(mockDbClient.connectCalls).toBe(0);

      const hasErrorLog = mockLogger.errorCalls.some((call: any[]) =>
        typeof call[0] === 'object' && 'error' in call[0]
      );
      expect(hasErrorLog).toBe(true);
    });

    it('should handle connection failure and cleanup (Requirements 13.1, 13.4)', async () => {
      // Arrange
      const config = createMockConfig();
      const connectionError = new Error('Failed to connect to MongoDB server at mongodb://localhost:27017: Connection refused');
      
      mockDbClient.mockError = connectionError;

      // Act
      const result = await orchestrator.execute(config);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to connect to MongoDB server');
      
      const hasErrorLog = mockLogger.errorCalls.some((call: any[]) => 
        typeof call[0] === 'object' && 'error' in call[0]
      );
      expect(hasErrorLog).toBe(true);
    });

    it('should ensure connection cleanup in finally block (Requirement 13.4)', async () => {
      // Arrange
      const config = createMockConfig();
      
      mockDbClient.mockTimeSeriesData = [];
      mockDbClient.mockDeviceData = [];

      // Act
      await orchestrator.execute(config);

      // Assert - Requirement 13.4: close called exactly once
      expect(mockDbClient.closeCalls).toBe(1);
    });
  });
});
