# MongoDB CSV Exporter - CLI Usage Guide

## Overview

The MongoDB CSV Exporter is a command-line application that extracts time series sensor data from MongoDB collections and exports it to CSV files for machine learning training.

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Command Structure

```bash
npm start -- [OPTIONS]
```

Or using the built version directly:

```bash
node dist/index.js [OPTIONS]
```

## Configuration Options

### Command-Line Arguments

| Argument | Description | Required | Example |
|----------|-------------|----------|---------|
| `--config <path>` | Load configuration from JSON file | No | `--config ./config.json` |
| `--location-codes <codes>` | Comma-separated list of location codes | Yes* | `--location-codes LOC001,LOC002` |
| `--parameter-types <types>` | Comma-separated list of parameter types | Yes* | `--parameter-types temp,humidity` |
| `--output <path>` | Output CSV file path | Yes* | `--output ./output/export.csv` |
| `--mongo-uri <uri>` | MongoDB connection URI | Yes* | `--mongo-uri mongodb://localhost:27017` |
| `--mongo-db <name>` | MongoDB database name | Yes* | `--mongo-db citybit_prod` |
| `--start-date <date>` | Optional: Start date for time range filter (ISO 8601) | No | `--start-date 2024-01-01T00:00:00.000Z` |
| `--end-date <date>` | Optional: End date for time range filter (ISO 8601) | No | `--end-date 2024-01-31T23:59:59.999Z` |
| `--help, -h` | Show help message | No | `--help` |

\* Required unless provided via config file or environment variables

### Environment Variables

Environment variables can be used as defaults, but command-line arguments take precedence:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection URI | `mongodb://localhost:27017` |
| `MONGO_DB` | MongoDB database name | `citybit_prod` |
| `OUTPUT_DIR` | Base directory for output files | `./output` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |

## Usage Examples

### Example 1: Using Command-Line Arguments

```bash
npm start -- \
  --location-codes LOC001,LOC002,LOC003 \
  --parameter-types temp,humidity,pm25 \
  --output ./output/export.csv \
  --mongo-uri mongodb://localhost:27017 \
  --mongo-db citybit_prod
```

### Example 2: Using Environment Variables

```bash
export MONGO_URI=mongodb://localhost:27017
export MONGO_DB=citybit_prod
export OUTPUT_DIR=./output

npm start -- \
  --location-codes LOC001,LOC002 \
  --parameter-types temp,humidity
```

### Example 3: Using Config File

Create a config file `config.json`:

```json
{
  "locationCodes": ["LOC001", "LOC002", "LOC003"],
  "parameterTypes": ["temp", "humidity", "pm25"],
  "mongoUri": "mongodb://localhost:27017",
  "databaseName": "citybit_prod",
  "outputPath": "./output/export.csv"
}
```

Then run:

```bash
npm start -- --config ./config.json
```

### Example 4: Mixing Config Sources

You can combine config file with command-line overrides:

```bash
export MONGO_URI=mongodb://localhost:27017
export MONGO_DB=citybit_prod

npm start -- \
  --config ./config.json \
  --output ./output/custom-export.csv
```

Priority order (highest to lowest):
1. Command-line arguments
2. Config file
3. Environment variables

### Example 5: Export Data for a Specific Time Range

```bash
# Export only data from January 2024
npm start -- \
  --config ./config.json \
  --start-date 2024-01-01T00:00:00.000Z \
  --end-date 2024-01-31T23:59:59.999Z
```

### Example 6: Export All Data After a Specific Date

```bash
# Export all data from February 2024 onwards (no end date)
npm start -- \
  --config ./config.json \
  --start-date 2024-02-01T00:00:00.000Z
```

### Example 7: Export All Data Before a Specific Date

```bash
# Export all data up to December 2023 (no start date)
npm start -- \
  --config ./config.json \
  --end-date 2023-12-31T23:59:59.999Z
```

## Config File Format

The config file must be valid JSON:

```json
{
  "locationCodes": ["LOC001", "LOC002"],
  "parameterTypes": ["temp", "humidity", "pm25"],
  "mongoUri": "mongodb://localhost:27017",
  "databaseName": "citybit_prod",
  "outputPath": "./output/export.csv",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T23:59:59.999Z"
}
```

All fields except `startDate` and `endDate` are required unless provided via other means (environment variables or command-line arguments).

### Time Range Filtering

The `startDate` and `endDate` fields are optional and allow you to filter data by timestamp:

- **Both omitted**: All data is exported
- **Only startDate**: All data from that date onwards
- **Only endDate**: All data up to that date
- **Both provided**: Only data within the range

Dates must be in ISO 8601 format (e.g., `"2024-01-15T00:00:00.000Z"`)

## Output

The application generates a CSV file with the following columns:

| Column | Description |
|--------|-------------|
| `locationCode` | Sensor location identifier |
| `mainType` | Device classification (indoor/outdoor) |
| `tp` | Sensor type |
| `k` | Parameter type (measurement type) |
| `t` | Timestamp (ISO 8601 format) |
| `v` | Measurement value (empty if negative) |

### Example Output

```csv
locationCode,mainType,tp,k,t,v
LOC001,outdoor,temperature_sensor,temp,2024-01-15T10:30:00.000Z,23.5
LOC001,outdoor,temperature_sensor,humidity,2024-01-15T10:30:00.000Z,65.2
LOC002,indoor,air_quality_sensor,pm25,2024-01-15T10:31:00.000Z,12.3
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Error occurred (validation failure, connection error, etc.) |

## Logging

The application uses structured logging with different levels:

- **ERROR**: Connection failures, file write failures, unrecoverable errors
- **WARN**: Missing device metadata, empty result sets
- **INFO**: Export progress, milestones, completion summary
- **DEBUG**: Query execution details, intermediate data counts

Set log level via environment variable:

```bash
export LOG_LEVEL=debug
npm start -- --config ./config.json
```

## Error Handling

### Configuration Errors

If configuration is invalid, the application will exit with detailed error messages:

```bash
$ npm start -- --location-codes LOC001
[ERROR] Configuration validation failed:
  - parameterTypes must be a non-empty array
  - mongoUri is required and must be a non-empty string
  - databaseName is required and must be a non-empty string
  - outputPath is required and must be a non-empty string
```

### Connection Errors

If MongoDB connection fails, the application will report the error:

```bash
[ERROR] Export failed
[ERROR] Error: Failed to connect to MongoDB: Connection refused
```

### Data Quality Warnings

The application continues processing when non-critical issues occur:

```bash
[WARN] Missing device metadata for location code: LOC999
[WARN] No measurements match the provided parameter types after filtering
[INFO] Export completed with 2 warning(s)
```

## Development

### Run in Development Mode

```bash
npm run dev -- --help
```

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

## MongoDB Requirements

The application expects two collections:

1. **measures_m2_ts**: Time series collection with documents containing:
   - `locationCode`: String
   - `dt`: Array of measurements with `k` (parameter type), `t` (timestamp), `v` (value)
   - `isFutureMessage`: Boolean
   - `isFutureData`: Boolean

2. **devices**: Device metadata collection with documents containing:
   - `locationCode`: String
   - `mainType`: String (e.g., "outdoor", "indoor")
   - `tp`: String (sensor type)

### Recommended Indexes

For optimal performance, create indexes:

```javascript
db.measures_m2_ts.createIndex({ locationCode: 1 });
db.devices.createIndex({ locationCode: 1 });
```

## Troubleshooting

### Problem: "parameterTypes must be a non-empty array"

**Solution**: Ensure you provide at least one parameter type:
```bash
--parameter-types temp
```

### Problem: "mongoUri must be a valid MongoDB connection string"

**Solution**: Ensure the URI starts with `mongodb://` or `mongodb+srv://`:
```bash
--mongo-uri mongodb://localhost:27017
```

### Problem: "No time series data found for the provided location codes"

**Solution**: Verify that the location codes exist in the `measures_m2_ts` collection.

### Problem: "Missing device metadata for location code: XXX"

**Solution**: This is a warning. The application will continue but will exclude measurements from that sensor. Ensure the device exists in the `devices` collection.

## Support

For issues or questions, refer to the main README.md or project documentation.
