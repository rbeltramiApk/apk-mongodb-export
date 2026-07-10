import type { Logger } from 'pino';
import { MongoDBClient } from '../data/MongoDBClient.js';
import { DataJoiner } from '../processing/DataJoiner.js';
import { DataFilter } from '../processing/DataFilter.js';
import { DataTransformer } from '../processing/DataTransformer.js';
import { CSVWriter } from '../output/CSVWriter.js';
import { resolveParameterColumns } from '../config/parameters.js';
import type { UserConfig } from '../config/types.js';
import type { ExportResult } from './types.js';
import type { CSVColumn } from '../output/types.js';

/**
 * ExportOrchestrator coordinates the entire export process
 * Validates: Requirements 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4
 * 
 * Pipeline stages:
 * 1. Connect to MongoDB
 * 2. Query time series data
 * 3. Query device metadata
 * 4. Join data with metadata
 * 5. Filter invalid records (future flags)
 * 6. Filter measurements by parameter type
 * 7. Transform to CSV rows
 * 8. Write CSV file
 * 9. Cleanup (close connection)
 */
export class ExportOrchestrator {
  constructor(
    private readonly dbClient: MongoDBClient,
    private readonly joiner: DataJoiner,
    private readonly filter: DataFilter,
    private readonly transformer: DataTransformer,
    private readonly writer: CSVWriter,
    private readonly logger: Logger
  ) {}

  /**
   * Resolve the ordered CSV columns for the export: a 'timestamp' column followed by
   * one column per requested parameter type, titled with its human-readable name.
   * Fails fast (throws) if any parameter code has no matching key in parameters.ts.
   */
  private buildColumns(config: UserConfig): CSVColumn[] {
    const parameterColumns = resolveParameterColumns(config.parameterTypes);
    return [
      { id: 'timestamp', title: 'timestamp' },
      ...parameterColumns.map((column) => ({ id: column.code, title: column.name })),
    ];
  }

  /**
   * Execute the complete export pipeline
   * 
   * @param config - User configuration with location codes, parameter types, and connection details
   * @returns Export result with success status, rows exported, output path, and any warnings
   * 
   * Requirements:
   * - 10.1: Log warning when device metadata is missing
   * - 10.2: Exclude measurements from sensors with missing metadata
   * - 10.3: Continue processing remaining sensors after encountering missing metadata
   * - 11.1: Log message when no documents match location codes
   * - 11.2: Log message when no measurements match parameter types
   * - 11.3: Create empty CSV file with headers when result set is empty
   * - 12.1: Log start of export operation
   * - 12.2: Log number of location codes being processed
   * - 12.3: Log number of parameter types being filtered
   * - 12.4: Log total number of CSV rows exported
   * - 12.5: Log output file path
   * - 13.1: Return error message with server address on connection failure
   * - 13.2: Return error message on authentication failure
   * - 13.3: Return error message with collection name if collection doesn't exist
   * - 13.4: Close database connection after export completes or fails
   */
  async execute(config: UserConfig): Promise<ExportResult> {
    const warnings: string[] = [];

    try {
      // Log export start (Requirement 12.1)
      this.logger.info('Starting export operation');
      
      // Log location codes and parameter types counts (Requirements 12.2, 12.3)
      this.logger.info({
        locationCodesCount: config.locationCodes.length,
        parameterTypesCount: config.parameterTypes.length
      }, 'Processing configuration');

      // Resolve and validate CSV columns up-front (fails fast on unknown parameter codes)
      const columns = this.buildColumns(config);
      this.logger.info({
        columns: columns.map((column) => column.title)
      }, 'Resolved CSV columns');

      // Stage 1: Connect to MongoDB
      this.logger.info('Connecting to MongoDB');
      await this.dbClient.connect(config.mongoUri, config.databaseName);
      this.logger.info('Connected to MongoDB successfully');

      // Stage 2: Query time series data
      this.logger.info('Querying time series data');
      const timeSeriesData = await this.dbClient.queryTimeSeries(config.locationCodes);
      this.logger.info({ count: timeSeriesData.length }, 'Retrieved time series documents');

      // Check for empty time series results (Requirement 11.1)
      if (timeSeriesData.length === 0) {
        const message = 'No time series data found for the provided location codes';
        this.logger.warn(message);
        warnings.push(message);
      }

      // Stage 3: Query device metadata
      this.logger.info('Querying device metadata');
      const deviceData = await this.dbClient.queryDevices(config.locationCodes);
      this.logger.info({ count: deviceData.length }, 'Retrieved device documents');

      // Stage 4: Join data with metadata
      this.logger.info('Joining time series data with device metadata');
      const joinResult = this.joiner.join(timeSeriesData, deviceData);
      this.logger.info({ joinedCount: joinResult.joined.length }, 'Data joined successfully');

      // Handle missing metadata (Requirements 10.1, 10.2, 10.3)
      if (joinResult.missingMetadata.length > 0) {
        for (const locationCode of joinResult.missingMetadata) {
          const warning = `Missing device metadata for location code: ${locationCode}`;
          this.logger.warn(warning);
          warnings.push(warning);
        }
      }

      // Stage 5: Filter invalid records (future flags)
      this.logger.info('Filtering invalid records');
      const validRecords = this.filter.filterInvalidRecords(joinResult.joined);
      this.logger.info({ 
        beforeCount: joinResult.joined.length,
        afterCount: validRecords.length 
      }, 'Filtered records with future flags');

      // Stage 6: Filter measurements by parameter type
      this.logger.info('Filtering measurements by parameter type');
      const filterCriteria = {
        parameterTypes: config.parameterTypes,
        startDate: config.startDate ? new Date(config.startDate) : undefined,
        endDate: config.endDate ? new Date(config.endDate) : undefined
      };
      const filteredRecords = this.filter.filterMeasurementsByParameterType(
        validRecords,
        filterCriteria
      );
      this.logger.info({ 
        recordsCount: filteredRecords.length 
      }, 'Filtered measurements by parameter type');

      // Check for empty results after filtering (Requirement 11.2)
      if (filteredRecords.length === 0) {
        const message = 'No measurements match the provided parameter types after filtering';
        this.logger.warn(message);
        warnings.push(message);
      }

      // Stage 7: Pivot to wide-format rows (one column per parameter type)
      this.logger.info('Transforming data to wide CSV rows');
      const wideRows = this.transformer.transformToWideRows(filteredRecords, config.parameterTypes);
      this.logger.info({ rowCount: wideRows.length }, 'Transformed to wide CSV rows');

      // Stage 8: Write single CSV file with dynamic columns
      this.logger.info('Writing CSV file');
      await this.writer.write(wideRows, columns, {
        outputPath: config.outputPath,
        createDirectory: true
      });
      
      // Log completion (Requirements 12.4, 12.5)
      this.logger.info({
        rowsExported: wideRows.length,
        outputPath: config.outputPath
      }, 'Export completed successfully');

      // Return success result
      return {
        success: true,
        rowsExported: wideRows.length,
        outputPath: config.outputPath,
        warnings
      };

    } catch (error) {
      // Log error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error({ error: errorMessage }, 'Export failed');

      // Return failure result
      return {
        success: false,
        rowsExported: 0,
        outputPath: config.outputPath,
        warnings,
        error: errorMessage
      };

    } finally {
      // Stage 9: Ensure connection cleanup in finally block (Requirement 13.4)
      if (this.dbClient.isConnected()) {
        this.logger.info('Closing MongoDB connection');
        await this.dbClient.close();
        this.logger.info('MongoDB connection closed');
      }
    }
  }

  /**
   * Execute export using streaming mode for large datasets (memory-efficient)
   * Processes data in batches to avoid loading everything into memory
   * 
   * @param config - User configuration
   * @param batchSize - Number of documents to process per batch (default: 1000)
   * @returns Export result
   */
  async executeStreaming(config: UserConfig, batchSize: number = 1000): Promise<ExportResult> {
    const warnings: string[] = [];
    let totalRowsWritten = 0;

    try {
      this.logger.info('Starting streaming export operation');
      
      this.logger.info({
        locationCodesCount: config.locationCodes.length,
        parameterTypesCount: config.parameterTypes.length,
        batchSize
      }, 'Processing configuration (streaming mode)');

      // Resolve and validate CSV columns up-front (fails fast on unknown parameter codes)
      const columns = this.buildColumns(config);
      this.logger.info({
        columns: columns.map((column) => column.title)
      }, 'Resolved CSV columns');

      // Stage 1: Connect to MongoDB
      this.logger.info('Connecting to MongoDB');
      await this.dbClient.connect(config.mongoUri, config.databaseName);
      this.logger.info('Connected to MongoDB successfully');

      // Stage 2: Query device metadata (small enough to keep in memory)
      this.logger.info('Querying device metadata');
      const deviceData = await this.dbClient.queryDevices(config.locationCodes);
      this.logger.info({ count: deviceData.length }, 'Retrieved device documents');

      // Initialize the single output CSV file with headers (timestamp + parameter columns)
      this.logger.info('Initializing output CSV file');
      await this.writer.initializeFile(columns, {
        outputPath: config.outputPath,
        createDirectory: true
      });

      // Stage 3: Stream time series data in batches
      this.logger.info('Streaming time series data in batches');
      
      let documentsProcessed = 0;
      let hasData = false;
      
      const totalDocuments = await this.dbClient.streamTimeSeries(
        config.locationCodes,
        batchSize,
        async (timeSeriesBatch) => {
          hasData = true;
          documentsProcessed += timeSeriesBatch.length;
          
          // Process batch
          const joinResult = this.joiner.join(timeSeriesBatch, deviceData);
          
          // Log warnings for missing metadata
          if (joinResult.missingMetadata.length > 0) {
            for (const locationCode of joinResult.missingMetadata) {
              const warning = `Missing device metadata for location code: ${locationCode}`;
              if (!warnings.includes(warning)) {
                this.logger.warn(warning);
                warnings.push(warning);
              }
            }
          }
          
          // Filter and transform to get the joined records (for Excel export)
          const validRecords = this.filter.filterInvalidRecords(joinResult.joined);
          const filterCriteria = {
            parameterTypes: config.parameterTypes,
            startDate: config.startDate ? new Date(config.startDate) : undefined,
            endDate: config.endDate ? new Date(config.endDate) : undefined
          };
          const filteredRecords = this.filter.filterMeasurementsByParameterType(
            validRecords,
            filterCriteria
          );
          
          // Pivot to wide rows and append to the single CSV file
          if (filteredRecords.length > 0) {
            const wideRows = this.transformer.transformToWideRows(
              filteredRecords,
              config.parameterTypes
            );
            await this.writer.appendRows(wideRows, columns, config.outputPath);
            totalRowsWritten += wideRows.length;
          }
          
          // Log progress
          this.logger.info({
            batchDocuments: timeSeriesBatch.length,
            rowsWritten: totalRowsWritten,
            totalDocuments: documentsProcessed
          }, 'Processed batch');
        }
      );

      // Check for empty results
      if (!hasData) {
        const message = 'No time series data found for the provided location codes';
        this.logger.warn(message);
        warnings.push(message);
      }

      if (totalRowsWritten === 0 && hasData) {
        const message = 'No measurements match the provided parameter types after filtering';
        this.logger.warn(message);
        warnings.push(message);
      }

      this.logger.info({
        totalDocuments,
        rowsWritten: totalRowsWritten,
        outputPath: config.outputPath
      }, 'Streaming export completed successfully');

      return {
        success: true,
        rowsExported: totalRowsWritten,
        outputPath: config.outputPath,
        warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error({ error: errorMessage }, 'Streaming export failed');
      
      return {
        success: false,
        rowsExported: totalRowsWritten,
        outputPath: config.outputPath,
        warnings,
        error: errorMessage
      };

    } finally {
      if (this.dbClient.isConnected()) {
        this.logger.info('Closing MongoDB connection');
        await this.dbClient.close();
        this.logger.info('MongoDB connection closed');
      }
    }
  }
}
