/**
 * MongoDB CSV Exporter
 * Main entry point for the application
 * 
 * CLI entry point with argument parsing
 * Validates: Requirements 1.1, 1.2, 12.1, 12.5, 13.1, 13.2, 13.3
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import pino from 'pino';
import { ConfigValidator } from './config/ConfigValidator.js';
import { MongoDBClient } from './data/MongoDBClient.js';
import { DataJoiner } from './processing/DataJoiner.js';
import { DataFilter } from './processing/DataFilter.js';
import { DataTransformer } from './processing/DataTransformer.js';
import { CSVWriter } from './output/CSVWriter.js';
import { ExportOrchestrator } from './orchestration/ExportOrchestrator.js';
import type { UserConfig } from './config/types.js';

/**
 * Parse command-line arguments
 * Supports:
 * - --config <path>: Load configuration from JSON file
 * - --location-codes <code1,code2,...>: Comma-separated location codes
 * - --parameter-types <type1,type2,...>: Comma-separated parameter types
 * - --output <path>: Output CSV file path
 * - --mongo-uri <uri>: MongoDB connection URI (can also use MONGO_URI env var)
 * - --mongo-db <name>: MongoDB database name (can also use MONGO_DB env var)
 * - --help: Show help message
 */
function parseArguments(): Partial<UserConfig> | null {
  const args = process.argv.slice(2);
  const config: Partial<UserConfig> = {};
  
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return null;
  }

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--config':
        if (!nextArg) {
          console.error('Error: --config requires a file path');
          process.exit(1);
        }
        // Load config from file
        try {
          const configPath = resolve(nextArg);
          const fileContent = readFileSync(configPath, 'utf-8');
          const fileConfig = JSON.parse(fileContent) as Partial<UserConfig>;
          Object.assign(config, fileConfig);
        } catch (error) {
          console.error(`Error loading config file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          process.exit(1);
        }
        i++; // Skip next argument
        break;

      case '--location-codes':
        if (!nextArg) {
          console.error('Error: --location-codes requires a comma-separated list');
          process.exit(1);
        }
        config.locationCodes = nextArg.split(',').map(s => s.trim()).filter(s => s.length > 0);
        i++;
        break;

      case '--parameter-types':
        if (!nextArg) {
          console.error('Error: --parameter-types requires a comma-separated list');
          process.exit(1);
        }
        config.parameterTypes = nextArg.split(',').map(s => s.trim()).filter(s => s.length > 0);
        i++;
        break;

      case '--output':
        if (!nextArg) {
          console.error('Error: --output requires a file path');
          process.exit(1);
        }
        config.outputPath = nextArg;
        i++;
        break;

      case '--mongo-uri':
        if (!nextArg) {
          console.error('Error: --mongo-uri requires a MongoDB connection string');
          process.exit(1);
        }
        config.mongoUri = nextArg;
        i++;
        break;

      case '--mongo-db':
        if (!nextArg) {
          console.error('Error: --mongo-db requires a database name');
          process.exit(1);
        }
        config.databaseName = nextArg;
        i++;
        break;

      case '--start-date':
        if (!nextArg) {
          console.error('Error: --start-date requires an ISO 8601 date string (e.g., 2024-01-15T00:00:00.000Z)');
          process.exit(1);
        }
        config.startDate = nextArg;
        i++;
        break;

      case '--end-date':
        if (!nextArg) {
          console.error('Error: --end-date requires an ISO 8601 date string (e.g., 2024-01-15T23:59:59.999Z)');
          process.exit(1);
        }
        config.endDate = nextArg;
        i++;
        break;

      default:
        if (arg.startsWith('--')) {
          console.error(`Error: Unknown argument: ${arg}`);
          console.error('Use --help to see available options');
          process.exit(1);
        }
    }
  }

  return config;
}

/**
 * Load configuration from environment variables
 * Environment variables have lower priority than command-line arguments
 */
function loadEnvironmentVariables(config: Partial<UserConfig>): void {
  // Load MONGO_URI if not provided via arguments (Requirement 1.1)
  if (!config.mongoUri && process.env.MONGO_URI) {
    config.mongoUri = process.env.MONGO_URI;
  }

  // Load MONGO_DB if not provided via arguments (Requirement 1.1)
  if (!config.databaseName && process.env.MONGO_DB) {
    config.databaseName = process.env.MONGO_DB;
  }

  // Load OUTPUT_DIR if not provided via arguments (Requirement 1.1)
  if (!config.outputPath && process.env.OUTPUT_DIR) {
    // If OUTPUT_DIR is provided but not full path, use it as directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    config.outputPath = resolve(process.env.OUTPUT_DIR, `export-${timestamp}.csv`);
  }
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
MongoDB CSV Exporter - Extract time series sensor data from MongoDB to CSV

USAGE:
  npm start -- [OPTIONS]

OPTIONS:
  --config <path>                Load configuration from JSON file
  --location-codes <codes>       Comma-separated list of location codes
  --parameter-types <types>      Comma-separated list of parameter types
  --output <path>                Output CSV file path
  --mongo-uri <uri>              MongoDB connection URI
  --mongo-db <name>              MongoDB database name
  --start-date <date>            Optional: Start date for time range filter (ISO 8601 format)
  --end-date <date>              Optional: End date for time range filter (ISO 8601 format)
  --help, -h                     Show this help message

ENVIRONMENT VARIABLES:
  MONGO_URI                      MongoDB connection URI
  MONGO_DB                       MongoDB database name
  OUTPUT_DIR                     Base directory for output files

EXAMPLES:
  # Using command-line arguments:
  npm start -- --location-codes LOC001,LOC002 --parameter-types temp,humidity \\
    --output ./output/export.csv --mongo-uri mongodb://localhost:27017 \\
    --mongo-db citybit_prod

  # With date range filter:
  npm start -- --location-codes LOC001,LOC002 --parameter-types temp,humidity \\
    --start-date 2024-01-01T00:00:00.000Z --end-date 2024-01-31T23:59:59.999Z \\
    --output ./output/export.csv

  # Using environment variables:
  export MONGO_URI=mongodb://localhost:27017
  export MONGO_DB=citybit_prod
  export OUTPUT_DIR=./output
  npm start -- --location-codes LOC001,LOC002 --parameter-types temp,humidity

  # Using config file:
  npm start -- --config ./config.json

CONFIG FILE FORMAT (JSON):
  {
    "locationCodes": ["LOC001", "LOC002"],
    "parameterTypes": ["temp", "humidity", "pm25"],
    "mongoUri": "mongodb://localhost:27017",
    "databaseName": "citybit_prod",
    "outputPath": "./output/export.csv",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z"
  }

DATE RANGE FILTERING:
  - Both startDate and endDate are optional
  - Dates must be in ISO 8601 format (e.g., "2024-01-15T00:00:00.000Z")
  - If only startDate is provided, all data from that date onwards is included
  - If only endDate is provided, all data up to that date is included
  - If both are provided, only data within the range is included
`);
}

/**
 * Main function - orchestrates the entire export process
 */
async function main(): Promise<void> {
  // Setup logger (Requirement 12.1)
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  });

  try {
    logger.info('MongoDB CSV Exporter starting...');

    // Parse command-line arguments
    const parsedConfig = parseArguments();
    
    // If null, help was shown or error occurred
    if (parsedConfig === null) {
      process.exit(0);
    }

    // Load environment variables (Requirement 1.1, 1.2)
    loadEnvironmentVariables(parsedConfig);

    // Validate that we have all required fields
    const config = parsedConfig as UserConfig;

    // Instantiate ConfigValidator and validate configuration (Requirement 1.2)
    const validator = new ConfigValidator();
    const validationResult = validator.validate(config);

    // Check validation result (Requirement 1.3)
    if (!validationResult.valid) {
      logger.error('Configuration validation failed:');
      validationResult.errors.forEach(error => {
        logger.error(`  - ${error}`);
      });
      process.exit(1);
    }

    logger.info('Configuration validated successfully');

    // Instantiate all components and wire dependencies (Requirement 1.2)
    const dbClient = new MongoDBClient();
    const joiner = new DataJoiner();
    const filter = new DataFilter();
    const transformer = new DataTransformer();
    const writer = new CSVWriter();

    // Create orchestrator with all dependencies
    const orchestrator = new ExportOrchestrator(
      dbClient,
      joiner,
      filter,
      transformer,
      writer,
      logger
    );

    // Execute export process using streaming mode for better memory efficiency
    logger.info('Starting export process in streaming mode...');
    const result = await orchestrator.executeStreaming(config);

    // Handle result and log appropriately (Requirements 12.4, 12.5)
    if (result.success) {
      logger.info('Export completed successfully');
      logger.info(`Rows exported: ${result.rowsExported}`);
      logger.info(`Output file: ${result.outputPath}`);
      
      // Log warnings if any
      if (result.warnings.length > 0) {
        logger.warn(`Export completed with ${result.warnings.length} warning(s):`);
        result.warnings.forEach(warning => {
          logger.warn(`  - ${warning}`);
        });
      }
      
      process.exit(0);
    } else {
      // Handle errors (Requirements 13.1, 13.2, 13.3)
      logger.error('Export failed');
      if (result.error) {
        logger.error(`Error: ${result.error}`);
      }
      
      // Log warnings if any occurred before failure
      if (result.warnings.length > 0) {
        logger.warn(`Warnings before failure:`);
        result.warnings.forEach(warning => {
          logger.warn(`  - ${warning}`);
        });
      }
      
      process.exit(1);
    }

  } catch (error) {
    // Handle unexpected top-level errors (Requirement 13.1, 13.2, 13.3)
    logger.error('Unexpected error occurred:');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    
    process.exit(1);
  }
}

// Run main function
main();
