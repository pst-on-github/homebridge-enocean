import { InMemoryDeviceInfoMap } from '../../enocean/InMemoryDeviceInfoMap';
import * as EnOCore from 'enocean-core';

describe('InMemoryDeviceInfoMap', () => {
  let deviceInfoMap: InMemoryDeviceInfoMap;
  let deviceId: EnOCore.DeviceId;
  let deviceInfo: EnOCore.DeviceInfo;

  beforeEach(() => {
    deviceInfoMap = new InMemoryDeviceInfoMap();
    deviceId = EnOCore.DeviceId.fromString('12:34:56:78');
    deviceInfo = { deviceId, label: 'Test Device', eep: EnOCore.EEPId.fromString('F6-01-01') } as EnOCore.DeviceInfo;
  });

  test('should set and get a device info', () => {
    deviceInfoMap.set(deviceInfo);
    const retrievedInfo = deviceInfoMap.get(deviceId);
    expect(retrievedInfo).toEqual(deviceInfo);
  });

  test('should return undefined for non-existent device', () => {
    const retrievedInfo = deviceInfoMap.get(deviceId);
    expect(retrievedInfo).toBeUndefined();
  });

  test('should check if a device exists', () => {
    deviceInfoMap.set(deviceInfo);
    const hasDevice = deviceInfoMap.has(deviceId);
    expect(hasDevice).toBe(true);
  });

  test('should return false for non-existent device', () => {
    const hasDevice = deviceInfoMap.has(deviceId);
    expect(hasDevice).toBe(false);
  });

  test('should delete a device', () => {
    deviceInfoMap.set(deviceInfo);
    const deleteResult = deviceInfoMap.delete(deviceId);
    expect(deleteResult).toBe(true);
    const hasDevice = deviceInfoMap.has(deviceId);
    expect(hasDevice).toBe(false);
  });

  test('should return false when deleting non-existent device', () => {
    const deleteResult = deviceInfoMap.delete(deviceId);
    expect(deleteResult).toBe(false);
  });

  test('should throw error on clear', () => {
    expect(() => deviceInfoMap.clear()).toThrow('CLEAR not yet implemented');
  });

  test('should iterate over all devices', () => {
    const deviceId2 = EnOCore.DeviceId.fromString('78:56:34:12');
    const deviceInfo2 = { deviceId: deviceId2, label: 'Another Device', eep: EnOCore.EEPId.fromString('F6-01-01') } as EnOCore.DeviceInfo;

    deviceInfoMap.set(deviceInfo);
    deviceInfoMap.set(deviceInfo2);

    const callback = jest.fn();
    deviceInfoMap.forEach(callback);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(deviceInfo, deviceId);
    expect(callback).toHaveBeenCalledWith(deviceInfo2, deviceId2);
  });
});