# MongoDB CSV Exporter

Node.js application that extracts time series sensor data from MongoDB collections and exports it to CSV files for machine learning training.

## Quick Start

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Setup configuration (choose one method below)
# Method 1: Copy and edit .env file
copy .env.example .env

# Method 2: Copy and edit config file
copy config.example.json config.json

# Run the application
npm start -- --config ./config.json
```

## Documentation

- **[CLI Usage Guide](./CLI_USAGE.md)** - Detailed command-line usage, configuration options, and examples
- **[Project Setup](./PROJECT_SETUP.md)** - Development setup and project structure

## Configuration

The application supports **three configuration methods** with the following priority order:

**Priority: Command-line arguments > Config file > Environment variables**

### Method 1: Environment Variables (Recommended for Credentials)

Best for storing sensitive data like MongoDB credentials.

1. Copy the example file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` with your MongoDB credentials:
   ```env
   MONGO_USERNAME=admin
   MONGO_PASSWORD=secretpassword
   MONGO_URI=mongodb://localhost:27017
   MONGO_DB=citybit_prod
   OUTPUT_DIR=./output
   LOG_LEVEL=info
   ```

3. Run with additional parameters:
   ```bash
   npm start -- --location-codes LOC001,LOC002 --parameter-types temp,humidity
   ```

### Method 2: JSON Config File (Recommended for Data Parameters)

Best for specifying location codes, parameter types, and output paths.

1. Copy the example file:
   ```bash
   copy config.example.json config.json
   ```

2. Edit `config.json`:
   ```json
   {
     "locationCodes": ["LOC001", "LOC002"],
     "parameterTypes": ["temp", "humidity", "pm25"],
     "mongoUri": "mongodb://admin:password@localhost:27017",
     "databaseName": "citybit_prod",
     "outputPath": "./output/export.csv",
     "startDate": "2024-01-01T00:00:00.000Z",
     "endDate": "2024-01-31T23:59:59.999Z"
   }
   ```
   
   **Note:** The `startDate` and `endDate` fields are optional. If omitted, all data will be exported.

3. Run the application:
   ```bash
   npm start -- --config ./config.json
   ```

### Method 3: Command-Line Arguments Only

All configuration via command line:

```bash
npm start -- \
  --location-codes LOC001,LOC002 \
  --parameter-types temp,humidity,pm25 \
  --output ./output/export.csv \
  --mongo-uri mongodb://admin:password@localhost:27017 \
  --mongo-db citybit_prod
```

### Combined Approach (Recommended)

Use `.env` for credentials and config file or CLI for data parameters:

```bash
# .env file contains:
# MONGO_URI=mongodb://admin:password@localhost:27017
# MONGO_DB=citybit_prod
# OUTPUT_DIR=./output

# config.json contains location codes and parameter types
npm start -- --config ./config.json
```

## Usage Examples

### Example 1: Export Specific Locations and Parameters

```bash
npm start -- \
  --config ./config.json \
  --location-codes LOC001,LOC002 \
  --parameter-types temp,humidity
```

### Example 2: Using Environment Variables Only

```bash
# Set environment variables (Windows)
set MONGO_URI=mongodb://localhost:27017
set MONGO_DB=citybit_prod
set OUTPUT_DIR=./output

# Run with minimal CLI args
npm start -- --location-codes LOC001,LOC002 --parameter-types temp,humidity
```

### Example 3: Override Config File Settings

```bash
# Use config.json but override the output path
npm start -- --config ./config.json --output ./custom/path/export.csv
```

### Example 4: Export Data for a Specific Time Range

```bash
# Export only data from January 2024
npm start -- \
  --config ./config.json \
  --start-date 2024-01-01T00:00:00.000Z \
  --end-date 2024-01-31T23:59:59.999Z
```

### Example 5: Export All Data After a Specific Date

```bash
# Export all data from February 2024 onwards
npm start -- \
  --config ./config.json \
  --start-date 2024-02-01T00:00:00.000Z
```

## Features

- ✅ Extract time series data from MongoDB
- ✅ Join with device metadata
- ✅ Filter by location codes and parameter types
- ✅ **Optional time range filtering for targeted data extraction**
- ✅ Handle missing metadata gracefully
- ✅ Export to CSV format suitable for ML training
- ✅ Comprehensive logging and error handling
- ✅ Flexible configuration (CLI, file, or environment variables)
- ✅ **Streaming mode for memory-efficient processing of large datasets**

## Output Format

The application generates CSV files with the following columns:

```csv
locationCode,mainType,tp,k,t,v
LOC001,outdoor,temperature_sensor,temp,2024-01-15T10:30:00.000Z,23.5
```

### Automatic Filename Generation

The output CSV filename is automatically generated based on the location codes:

- **Single location code**: `LOC001.csv`
- **2-3 location codes**: `LOC001_LOC002.csv` or `LOC001_LOC002_LOC003.csv`
- **More than 3 codes**: `LOC001_LOC002_LOC003_and_2_more.csv`

This automatic naming applies when:
1. The `outputPath` is set to a directory (e.g., `./output`)
2. The `outputPath` ends with the default filename `export.csv` (will be replaced)
3. You can still specify a full custom path to override this behavior (e.g., `./output/my-custom-name.csv`)

## Performance and Large Datasets

The application uses **streaming mode by default** to efficiently handle large datasets without running out of memory.

### How Streaming Works

- Data is processed in batches of 1,000 documents at a time
- Only one batch is kept in memory at any moment
- CSV rows are written incrementally to disk
- This allows processing millions of records with minimal memory usage

### Memory Requirements

- **Small datasets** (< 10,000 documents): ~100-200 MB
- **Large datasets** (millions of documents): ~200-500 MB (constant, regardless of dataset size)

### If You Still Experience Memory Issues

If you encounter `JavaScript heap out of memory` errors, you can increase Node.js memory limit:

```bash
# Windows
set NODE_OPTIONS=--max-old-space-size=4096
npm start -- --config ./config.json

# Linux/Mac
export NODE_OPTIONS=--max-old-space-size=4096
npm start -- --config ./config.json
```

This sets the memory limit to 4GB (adjust as needed for your system).

## MongoDB Setup

Per ripristinare un dump:
* Modifica volumes in docker-compose
* Esegui docker compose exec -it mongodb mongorestore --username=admin --password=secretpassword --authenticationDatabase admin --db citybit_prod /container_dump

## Development

```bash
# Run in development mode
npm run dev -- --help
npm run dev -- --config ./config.json

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## Best practice
### In .env file (for credentials)
```
MONGO_URI=mongodb://user:password@localhost:27017
MONGO_DB=citybit_prod
OUTPUT_DIR=./output
```

### Run with config file (for data parameters)
```
npm start -- --config ./config.json
```

## Requirements

- Node.js v18+
- MongoDB v5.x or v6.x
- TypeScript v5.x

## License

MIT
