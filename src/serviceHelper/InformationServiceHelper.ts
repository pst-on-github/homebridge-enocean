import { EnOceanHomebridgePlatform } from '../platform';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { PlatformAccessory } from 'homebridge';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';

export class InformationServiceHelper {

  /**
   * Initializes the Accessory information characteristics
   * @param platform The platform of this accessory
   * @param accessory The accessory to setup
   * @param config The device configuration to apply
   * @returns The accessory information service
   */
  static setupService(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
  ) {

    // Each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/AccessoryInformation

    const service = accessory.getService(platform.Service.AccessoryInformation)!
      .setCharacteristic(platform.Characteristic.ConfiguredName, config.name)
      .setCharacteristic(platform.Characteristic.Manufacturer, config.manufacturer)
      .setCharacteristic(platform.Characteristic.Model, config.model)
      .setCharacteristic(platform.Characteristic.SerialNumber, config.devId.toString());

    // if (service.testCharacteristic(platform.Characteristic.FirmwareRevision)) {
    //   const firmwareRevisionCharacteristic = service.getCharacteristic(platform.Characteristic.FirmwareRevision);
    //   service.removeCharacteristic(firmwareRevisionCharacteristic);
    // }

    // service.addOptionalCharacteristic(platform.Characteristic.SoftwareRevision);
    // service.setCharacteristic(platform.Characteristic.SoftwareRevision, platform.version);

    const match = platform.version.match(/^\d+\.\d+\.\d+/);
    const fwRevision = match ? match[0] : platform.version;
    service.setCharacteristic(platform.Characteristic.FirmwareRevision, fwRevision);

    return service;
  }
}
