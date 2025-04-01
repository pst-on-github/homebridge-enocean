import { HbConfigUpdater } from '../../homebridge/HbConfigUpdater';
import { IDeviceConfig } from '../../homebridge/IDeviceConfig';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('HbConfigUpdater', () => {
  const mockConfigFilePath = '/path/to/config.json';
  const mockPlatformName = 'TestPlatform';
  const mockConfig = {
    platforms: [
      {
        platform: mockPlatformName,
        devices: [],
      },
    ],
  };

  let hbConfigUpdater: HbConfigUpdater;

  beforeEach(() => {
    hbConfigUpdater = new HbConfigUpdater(mockConfigFilePath, mockPlatformName);
    jest.clearAllMocks();
  });

  describe('addDeviceToHomebridgeConfig', () => {
    it('should add a new device to the platform configuration', async () => {
      const newDevice: IDeviceConfig = {
        name: 'Test Device',
        id: '12345',
        eep: 'A5-02-05',
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await hbConfigUpdater.addDeviceToHomebridgeConfig(newDevice);

      expect(fs.readFile).toHaveBeenCalledWith(mockConfigFilePath, 'utf-8');
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockConfigFilePath,
        JSON.stringify(
          {
            platforms: [
              {
                platform: mockPlatformName,
                devices: [newDevice],
              },
            ],
          },
          null,
          2,
        ),
        'utf-8',
      );
    });

    it('should throw an error if the platform is not found', async () => {
      const invalidConfig = { platforms: [] };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidConfig));

      const newDevice: IDeviceConfig = {
        name: 'Test Device',
        id: '12345',
        eep: 'A5-02-05',
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
      };

      await expect(hbConfigUpdater.addDeviceToHomebridgeConfig(newDevice)).rejects.toThrow(
        `${mockPlatformName}: no such platform in platforms in ${mockConfigFilePath}`,
      );

      expect(fs.readFile).toHaveBeenCalledWith(mockConfigFilePath, 'utf-8');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should initialize the devices array if it is undefined', async () => {
      const configWithoutDevices = {
        platforms: [
          {
            platform: mockPlatformName,
          },
        ],
      };

      const newDevice: IDeviceConfig = {
        name: 'Test Device',
        id: '12345',
        eep: 'A5-02-05',
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(configWithoutDevices));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await hbConfigUpdater.addDeviceToHomebridgeConfig(newDevice);

      expect(fs.readFile).toHaveBeenCalledWith(mockConfigFilePath, 'utf-8');
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockConfigFilePath,
        JSON.stringify(
          {
            platforms: [
              {
                platform: mockPlatformName,
                devices: [newDevice],
              },
            ],
          },
          null,
          2,
        ),
        'utf-8',
      );
    });
  });
});
