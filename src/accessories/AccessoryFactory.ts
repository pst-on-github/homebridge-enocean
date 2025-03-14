import { PlatformAccessory } from 'homebridge';
import { EnOceanHomebridgePlatform } from '../platform';

import { StatelessProgrammableSwitchAccessory } from './StatelessProgrammableSwitchAccessory';
import { TemperatureSensorAccessory } from './TemperatureSensorAccessory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { IEnoAccessory } from './IEnoAccessory';
import { OutletAccessory } from './OutletAccessory';
import { MotionSensorAccessory } from './MotionSensorAccessory';
import { WindowCoveringAccessory } from './WindowCoveringAccessory';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';
import { ContactSensorAccessory } from './ContactSensorAccessory';
import { LeakSensorAccessory } from './LeakSensorAccessory';

type AccessoryClassType = {
  new(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig): IEnoAccessory
};

export class AccessoryFactory {

  private classMap: Map<string, AccessoryClassType> = new Map<string, AccessoryClassType>();

  constructor() {
    this.registerClass('F6', StatelessProgrammableSwitchAccessory);
    this.registerClass('A5-02', TemperatureSensorAccessory);
    this.registerClass('A5-04', TemperatureSensorAccessory);
    this.registerClass('A5-08', MotionSensorAccessory);
    this.registerClass('A5-10', LeakSensorAccessory);
    this.registerClass('A5-14', ContactSensorAccessory);

    this.registerClass('A5-38-08', OutletAccessory);
    this.registerClass('A5-3F-7F', WindowCoveringAccessory);

    this.registerClass('D2-05-00', WindowCoveringAccessory);
  }

  private registerClass(id: string, classRef: AccessoryClassType): void {
    this.classMap.set(id, classRef);
  }

  newAccessory(
    eep: string,
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,

  ): IEnoAccessory {

    let classRef = this.classMap.get(eep);

    if (!classRef) {
      classRef = this.classMap.get(eep.substring(0, 5));
    }

    if (!classRef) {
      classRef = this.classMap.get(eep.substring(0, 2));
    }

    // TODO
    if (/contact/i.test(config.model)) {
      classRef = ContactSensorAccessory;
    }

    if (!classRef) {
      throw new Error(`${eep}: EEP not supported`);
    }

    return new classRef(platform, accessory, config);
  }
}
