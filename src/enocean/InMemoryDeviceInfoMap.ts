import * as EnOCore from 'enocean-core';

export class InMemoryDeviceInfoMap implements EnOCore.DeviceInfoMap {

  private devices: Map<string, EnOCore.DeviceInfo> = new Map();

  get(device: EnOCore.DeviceId): EnOCore.DeviceInfo | undefined  {
    return this.devices.get(device.toString());
  }

  set(info: EnOCore.DeviceInfo): void {
    this.devices.set(info.deviceId.toString(), info);
  }

  has(device: EnOCore.DeviceId): boolean {
    return this.devices.has(device.toString());
  }

  delete(device: EnOCore.DeviceId): boolean {
    const result = this.devices.delete(device.toString());
    return result;
  }

  clear(): void {
    throw new Error('CLEAR not yet implemented');
  }

  forEach(callbackfn: (info: EnOCore.DeviceInfo, device: EnOCore.DeviceId) => void): void {
    this.devices.forEach((info, deviceString) => {
      callbackfn(info, EnOCore.DeviceId.fromString(deviceString));
    });
  }
}