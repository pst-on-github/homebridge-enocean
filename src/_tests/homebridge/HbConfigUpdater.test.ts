import { HbConfigUpdater } from '../../homebridge/HbConfigUpdater';
import { IDeviceConfig } from '../../homebridge/IDeviceConfig';
import * as fs from 'fs';

jest.mock('fs');

describe('ConfigWriter', () => {
  const configFilePath = '/path/to/config.json';
  const platformName = 'EnOcean';
  let configWriter: HbConfigUpdater;

  beforeEach(() => {
    configWriter = new HbConfigUpdater(configFilePath, platformName);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should add a new device to the Homebridge config', () => {
    const mockConfig = {
      platforms: [
        {
          platform: 'EnOcean',
          accessories: [],
        },
      ],
    };

    const newDevice: IDeviceConfig = {
      id: 'device1',
      eep: 'a5-02-05',
      name: 'Test Device',
      model: 'Model1',
      manufacturer: 'Manufacturer1',
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
    const writeFileSyncMock = fs.writeFileSync as jest.Mock;

    configWriter.addDeviceToHomebridgeConfig(newDevice);

    expect(writeFileSyncMock).toHaveBeenCalledWith(
      configFilePath,
      JSON.stringify({
        platforms: [
          {
            platform: 'EnOcean',
            accessories: [newDevice],
          },
        ],
      }, null, 2),
      'utf-8',
    );
  });

  it('should throw an error if EnOcean platform is not found', () => {
    const mockConfig = {
      platforms: [
        {
          platform: 'OtherPlatform',
          accessories: [],
        },
      ],
    };

    const newDevice: IDeviceConfig = {
      id: 'device1',
      eep: 'a5-02-05',
      name: 'Test Device',
      model: 'Model1',
      manufacturer: 'Manufacturer1',
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

    expect(() => {
      configWriter.addDeviceToHomebridgeConfig(newDevice);
    }).toThrow('EnOcean: no such platform in config');
  });

  it('should initialize accessories array if it is undefined', () => {
    const mockConfig = {
      platforms: [
        {
          platform: 'EnOcean',
        },
      ],
    };

    const newDevice: IDeviceConfig = {
      id: 'device1',
      eep: 'a5-02-05',
      name: 'Test Device',
      model: 'Model1',
      manufacturer: 'Manufacturer1',
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
    const writeFileSyncMock = fs.writeFileSync as jest.Mock;

    configWriter.addDeviceToHomebridgeConfig(newDevice);

    expect(writeFileSyncMock).toHaveBeenCalledWith(
      configFilePath,
      JSON.stringify({
        platforms: [
          {
            platform: 'EnOcean',
            accessories: [newDevice],
          },
        ],
      }, null, 2),
      'utf-8',
    );
  });

  it('should add a new device to an existing accessories array', () => {
    const mockConfig = {
      platforms: [
        {
          platform: 'EnOcean',
          accessories: [
            {
              id: 'existingDevice',
              eep: 'a5-02-05',
              name: 'Existing Device',
              model: 'Model2',
              manufacturer: 'Manufacturer2',
            },
          ],
        },
      ],
    };

    const newDevice: IDeviceConfig = {
      id: 'device1',
      eep: 'a5-02-05',
      name: 'Test Device',
      model: 'Model1',
      manufacturer: 'Manufacturer1',
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
    const writeFileSyncMock = fs.writeFileSync as jest.Mock;

    configWriter.addDeviceToHomebridgeConfig(newDevice);

    expect(writeFileSyncMock).toHaveBeenCalledWith(
      configFilePath,
      JSON.stringify({
        platforms: [
          {
            platform: 'EnOcean',
            accessories: [
              {
                id: 'existingDevice',
                eep: 'a5-02-05',
                name: 'Existing Device',
                model: 'Model2',
                manufacturer: 'Manufacturer2',
              },
              newDevice,
            ],
          },
        ],
      }, null, 2),
      'utf-8',
    );
  });
});
