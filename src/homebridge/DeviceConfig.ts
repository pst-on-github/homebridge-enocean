import * as EnoCore from 'enocean-core';
import { IDeviceConfig } from './IDeviceConfig';
import { Util } from '../util';

/**
 * EnOcean Device Configuration
 */
export class DeviceConfig implements IDeviceConfig {

  readonly devId: EnoCore.DeviceId;
  readonly eepId: EnoCore.EEPId;
  readonly manufacturerId: number; // Although there is an enum use number type for easier comparison

  public manufacturer: string;
  public model: string;
  public name: string;

  public time?: number;

  private static manufacturerFromString(value: string): number {
    if (value === undefined) {
      return EnoCore.Manufacturers.Reserved;
    }

    const mNames = Object.keys(EnoCore.Manufacturers).filter(key => isNaN(Number(key)));
    const caseValue = value.trim().toUpperCase().replace(/[ -]/, '_');

    const foundName = mNames.filter(name => {
      const [shorter, longer] = name.length <= caseValue.length ? [name, caseValue] : [caseValue, name];
      if (longer.includes(shorter)) {
        return name;
      };
    });

    let num: number = EnoCore.Manufacturers.Reserved;

    if (foundName.length > 0) {
      num = EnoCore.Manufacturers[foundName[0] as keyof typeof EnoCore.Manufacturers];
    }

    return num;
  }

  constructor(
    public id: string,
    public eep: string,
    name?: string,
    manufacturer?: string,
    model?: string,
  ) {
    this.devId = EnoCore.DeviceId.fromString(id);
    this.eepId = EnoCore.EEPId.fromString(eep);

    this.name = name ?? 'EnOcean ' + this.eepId.toString();
    this.manufacturer = manufacturer ?? 'Reserved';

    this.model = Util.isNullOrEmpty(model) ? this.eepId.toString() : model!;

    this.manufacturerId = DeviceConfig.manufacturerFromString(this.manufacturer);
  }
}
