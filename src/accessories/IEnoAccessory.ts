import { DeviceConfig } from '../homebridge/DeviceConfig';
import { EnoGateway } from '../enocean/EnoGateway';
import { PlatformAccessory } from 'homebridge';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';

export interface IEnoAccessory {

  readonly config: DeviceConfig;
  readonly accessory: PlatformAccessory<EnoAccessoryContext>;

  setGateway(gateway: EnoGateway): Promise<void>;
}
