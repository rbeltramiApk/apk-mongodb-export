import { MongoClient, Db, Collection } from 'mongodb';
import { TimeSeriesDocument, DeviceDocument } from './types.js';

/**
 * MongoDB client for connecting to and querying the database
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3
 */
export class MongoDBClient {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  /**
   * Connect to MongoDB database
   * Validates: Requirements 2.1, 2.2, 2.3
   * 
   * @param uri MongoDB connection string
   * @param dbName Database name
   * @throws Error if connection fails, authentication fails, or database/collections are not accessible
   */
  async connect(uri: string, dbName: string): Promise<void> {
    try {
      
      // Attempt to connect to MongoDB
      this.client = new MongoClient(uri);
      await this.client.connect();
      
      // Access the database
      this.db = this.client.db(dbName);
      
      // Verify database connection by listing collections
      // This also validates authentication
      await this.db.listCollections().toArray();
      
    } catch (error: any) {
      // Close any partial connections
      if (this.client) {
        try {
          await this.client.close();
        } catch (closeError) {
          // Ignore close errors during error handling
        }
        this.client = null;
        this.db = null;
      }
      
      // Handle different error types
      if (error.name === 'MongoServerError' && error.code === 18) {
        // Authentication failed
        throw new Error(`Authentication failed for MongoDB server at ${uri}`);
      } else if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
        // Connection error
        throw new Error(`Failed to connect to MongoDB server at ${uri}: ${error.message}`);
      } else {
        // Other errors
        throw new Error(`Database connection error: ${error.message}`);
      }
    }
  }

  /**
   * Query time series collection for documents matching location codes
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
   * 
   * @param locationCodes Array of location codes to query
   * @returns Array of time series documents
   * @throws Error if collection doesn't exist or query fails
   */
  async queryTimeSeries(
    locationCodes: string[]
  ): Promise<TimeSeriesDocument[]> {
    if (!this.db) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    try {
      // Check if collection exists
      const collections = await this.db.listCollections({ name: 'measures_m2_ts' }).toArray();
      if (collections.length === 0) {
        throw new Error('Collection "measures_m2_ts" does not exist in database');
      }

      const collection: Collection = this.db.collection('measures_m2_ts');
      
      // Build query with $in filter for location codes
      const query: any = {
        locationCode: { $in: locationCodes }
      };
      
      // Build projection to only retrieve required fields
      const projection = {
        locationCode: 1,
        dt: 1,
        isFutureMessage: 1,
        isFutureData: 1,
        _id: 0  // Exclude MongoDB _id field
      };
      
      // Execute query
      const documents = await collection
        .find(query)
        .project(projection)
        .toArray();
      
      return documents as TimeSeriesDocument[];
      
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Failed to query time series collection: ${error.message}`);
    }
  }

  /**
   * Stream time series collection for documents matching location codes using cursor
   * Memory-efficient alternative to queryTimeSeries for large datasets
   * 
   * @param locationCodes Array of location codes to query
   * @param batchSize Number of documents to process per batch (default: 1000)
   * @param onBatch Callback function to process each batch of documents
   * @throws Error if collection doesn't exist or query fails
   */
  async streamTimeSeries(
    locationCodes: string[],
    batchSize: number = 1000,
    onBatch: (documents: TimeSeriesDocument[]) => Promise<void>
  ): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    try {
      // Check if collection exists
      const collections = await this.db.listCollections({ name: 'measures_m2_ts' }).toArray();
      if (collections.length === 0) {
        throw new Error('Collection "measures_m2_ts" does not exist in database');
      }

      const collection: Collection = this.db.collection('measures_m2_ts');
      
      // Build query with $in filter for location codes
      const query: any = {
        locationCode: { $in: locationCodes }
      };
      
      // Build projection to only retrieve required fields
      const projection = {
        locationCode: 1,
        dt: 1,
        isFutureMessage: 1,
        isFutureData: 1,
        _id: 0
      };
      
      // Create cursor for streaming
      const cursor = collection.find(query).project(projection);
      
      let batch: TimeSeriesDocument[] = [];
      let totalProcessed = 0;
      
      // Process documents in batches using async iterator
      for await (const doc of cursor) {
        batch.push(doc as TimeSeriesDocument);
        
        if (batch.length >= batchSize) {
          await onBatch(batch);
          totalProcessed += batch.length;
          batch = [];
        }
      }
      
      // Process remaining documents in final batch
      if (batch.length > 0) {
        await onBatch(batch);
        totalProcessed += batch.length;
      }
      
      return totalProcessed;
      
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Failed to stream time series collection: ${error.message}`);
    }
  }

  /**
   * Query devices collection for documents matching location codes
   * Validates: Requirements 4.1, 4.2, 4.3
   * 
   * @param locationCodes Array of location codes to query
   * @returns Array of device documents
   * @throws Error if collection doesn't exist or query fails
   */
  async queryDevices(locationCodes: string[]): Promise<DeviceDocument[]> {
    if (!this.db) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    try {
      // Check if collection exists
      const collections = await this.db.listCollections({ name: 'devices' }).toArray();
      if (collections.length === 0) {
        throw new Error('Collection "devices" does not exist in database');
      }

      const collection: Collection = this.db.collection('devices');
      
      // Build query with $in filter for location codes
      const query = {
        locationCode: { $in: locationCodes }
      };
      
      // Build projection to only retrieve required fields
      const projection = {
        locationCode: 1,
        mainType: 1,
        tp: 1,
        _id: 0  // Exclude MongoDB _id field
      };
      
      // Execute query
      const documents = await collection
        .find(query)
        .project(projection)
        .toArray();
      
      return documents as DeviceDocument[];
      
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Failed to query devices collection: ${error.message}`);
    }
  }

  /**
   * Close the MongoDB connection
   * Validates: Requirement 13.4
   * 
   * Should be called when done with the database or in case of errors
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } finally {
        this.client = null;
        this.db = null;
      }
    }
  }

  /**
   * Check if the client is connected
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }
}
