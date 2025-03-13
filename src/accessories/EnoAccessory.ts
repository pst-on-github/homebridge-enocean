import { CharacteristicValue, HAP, PlatformAccessory } from 'homebridge';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { EnOceanHomebridgePlatform } from '../platform';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';

export class EnoAccessory {

  /**
   * Convenience property for `platform.api.hap`
   */
  protected readonly hap: HAP;

  constructor(
    protected readonly platform: EnOceanHomebridgePlatform,
    public readonly accessory: PlatformAccessory<EnoAccessoryContext>,
    public readonly config: DeviceConfig,
  ) {
    this.hap = platform.api.hap;
  }

  /**
   * Retrieves the specified property value.
   * 
   * @param property - The characteristic value to retrieve. If undefined, an error is thrown.
   * @returns A promise that resolves to the characteristic value.
   * @throws HapStatusError - If the property is undefined, indicating a service communication failure.
   */
  protected async getProperty(property: CharacteristicValue | undefined): Promise<CharacteristicValue> {

    // If you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    if (property === undefined) {
      this.platform.log.warn(`${this.accessory.displayName}: GET() was undefined -> com fail`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
   
    //this.platform.log.debug(`${this.accessory.displayName}: GET() returned '${property}'`);
    return property;
  }
}
