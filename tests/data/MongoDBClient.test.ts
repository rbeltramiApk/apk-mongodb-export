import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock functions before they're needed
const mockConnect = jest.fn<() => Promise<void>>();
const mockDb = jest.fn();
const mockClose = jest.fn<() => Promise<void>>();
const mockFind = jest.fn();
const mockProject = jest.fn();
const mockToArray = jest.fn<() => Promise<any>>();
const mockListCollections = jest.fn();
const mockCollection = jest.fn();

// Mock MongoClient class
class MockMongoClient {
  connect = mockConnect;
  db = mockDb;
  close = mockClose;
}

// Mock the mongodb module
jest.mock('mongodb', () => ({
  MongoClient: MockMongoClient
}));

// Now import the module under test
import { MongoDBClient } from '../../src/data/MongoDBClient.js';

describe('MongoDBClient', () => {
  let client: MongoDBClient;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockToArray.mockResolvedValue([]);
    mockProject.mockReturnValue({ toArray: mockToArray });
    mockFind.mockReturnValue({ project: mockProject });
    mockCollection.mockReturnValue({ find: mockFind });
    
    const mockListCollectionsResult = {
      toArray: jest.fn<() => Promise<any>>().mockResolvedValue([
        { name: 'measures_m2_ts' },
        { name: 'devices' }
      ])
    };
    
    mockListCollections.mockReturnValue(mockListCollectionsResult);
    mockDb.mockReturnValue({
      listCollections: mockListCollections,
      collection: mockCollection
    });
    
    mockConnect.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);
    
    client = new MongoDBClient();
  });

  describe('connect', () => {
    it('should successfully connect to MongoDB', async () => {
      await client.connect('mongodb://localhost:27017', 'testdb');
      
      expect(mockConnect).toHaveBeenCalled();
      expect(mockDb).toHaveBeenCalledWith('testdb');
      expect(client.isConnected()).toBe(true);
    });

    it('should throw error with server address on connection failure', async () => {
      const error: any = new Error('Network timeout');
      error.name = 'MongoNetworkError';
      mockConnect.mockRejectedValueOnce(error);

      await expect(
        client.connect('mongodb://localhost:27017', 'testdb')
      ).rejects.toThrow('Failed to connect to MongoDB server at mongodb://localhost:27017');
      
      expect(mockClose).toHaveBeenCalled();
    });

    it('should throw error on authentication failure', async () => {
      const error: any = new Error('Authentication failed');
      error.name = 'MongoServerError';
      error.code = 18;
      mockConnect.mockRejectedValueOnce(error);

      await expect(
        client.connect('mongodb://localhost:27017', 'testdb')
      ).rejects.toThrow('Authentication failed for MongoDB server at mongodb://localhost:27017');
      
      expect(mockClose).toHaveBeenCalled();
    });

    it('should close client on connection error', async () => {
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(error);

      await expect(
        client.connect('mongodb://localhost:27017', 'testdb')
      ).rejects.toThrow();
      
      expect(mockClose).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('queryTimeSeries', () => {
    beforeEach(async () => {
      await client.connect('mongodb://localhost:27017', 'testdb');
      jest.clearAllMocks(); // Clear connect-related mocks
    });

    it('should throw error if not connected', async () => {
      const disconnectedClient = new MongoDBClient();
      
      await expect(
        disconnectedClient.queryTimeSeries(['LOC001'])
      ).rejects.toThrow('Database connection not established');
    });

    it('should throw error if collection does not exist', async () => {
      mockListCollections.mockReturnValueOnce({
        toArray: jest.fn<() => Promise<any>>().mockResolvedValue([]),
      });

      await expect(
        client.queryTimeSeries(['LOC001'])
      ).rejects.toThrow('Collection "measures_m2_ts" does not exist in database');
    });

    it('should query time series with $in filter and correct projection', async () => {
      const locationCodes = ['LOC001', 'LOC002'];
      const mockData = [
        {
          locationCode: 'LOC001',
          dt: [{ k: 'temp', t: new Date(), v: 25 }],
          isFutureMessage: false,
          isFutureData: false,
        },
      ];
      
      mockToArray.mockResolvedValueOnce(mockData);

      const result = await client.queryTimeSeries(locationCodes);

      expect(mockCollection).toHaveBeenCalledWith('measures_m2_ts');
      expect(mockFind).toHaveBeenCalledWith({
        locationCode: { $in: locationCodes },
      });
      expect(mockProject).toHaveBeenCalledWith({
        locationCode: 1,
        dt: 1,
        isFutureMessage: 1,
        isFutureData: 1,
        _id: 0,
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('queryDevices', () => {
    beforeEach(async () => {
      await client.connect('mongodb://localhost:27017', 'testdb');
      jest.clearAllMocks(); // Clear connect-related mocks
    });

    it('should throw error if not connected', async () => {
      const disconnectedClient = new MongoDBClient();
      
      await expect(
        disconnectedClient.queryDevices(['LOC001'])
      ).rejects.toThrow('Database connection not established');
    });

    it('should throw error if collection does not exist', async () => {
      mockListCollections.mockReturnValueOnce({
        toArray: jest.fn<() => Promise<any>>().mockResolvedValue([]),
      });

      await expect(
        client.queryDevices(['LOC001'])
      ).rejects.toThrow('Collection "devices" does not exist in database');
    });

    it('should query devices with $in filter and correct projection', async () => {
      const locationCodes = ['LOC001', 'LOC002'];
      const mockData = [
        {
          locationCode: 'LOC001',
          mainType: 'outdoor',
          tp: 'temperature_sensor',
        },
      ];
      
      mockToArray.mockResolvedValueOnce(mockData);

      const result = await client.queryDevices(locationCodes);

      expect(mockCollection).toHaveBeenCalledWith('devices');
      expect(mockFind).toHaveBeenCalledWith({
        locationCode: { $in: locationCodes },
      });
      expect(mockProject).toHaveBeenCalledWith({
        locationCode: 1,
        mainType: 1,
        tp: 1,
        _id: 0,
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('close', () => {
    it('should close the MongoDB connection', async () => {
      await client.connect('mongodb://localhost:27017', 'testdb');
      jest.clearAllMocks();
      expect(client.isConnected()).toBe(true);

      await client.close();

      expect(mockClose).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);
    });

    it('should handle close when not connected', async () => {
      await expect(client.close()).resolves.not.toThrow();
      expect(client.isConnected()).toBe(false);
    });

    it('should reset connection state even if close fails', async () => {
      await client.connect('mongodb://localhost:27017', 'testdb');
      mockClose.mockRejectedValueOnce(new Error('Close failed'));

      await client.close();

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('should return false before connection', () => {
      expect(client.isConnected()).toBe(false);
    });

    it('should return true after successful connection', async () => {
      await client.connect('mongodb://localhost:27017', 'testdb');
      expect(client.isConnected()).toBe(true);
    });

    it('should return false after close', async () => {
      await client.connect('mongodb://localhost:27017', 'testdb');
      await client.close();
      expect(client.isConnected()).toBe(false);
    });
  });
});
