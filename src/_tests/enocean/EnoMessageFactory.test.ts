import { EnoMessageFactory } from '../../enocean/EnoMessageFactory';
import * as EnoCore from 'enocean-core';

describe('EnoMessageFactory', () => {
  describe('new4bsTeachInMessageUni', () => {
    it('should create a valid ERP1Telegram for valid inputs', () => {
      const localDeviceId = EnoCore.DeviceId.fromString('01:02:03:04');
      const eepId = EnoCore.EEPId.fromTriple(0xA5, 0x01, 0x01); // valid func and type
      const manufacturer = 0x123;

      const erp1 = EnoMessageFactory.newFourBSTeachInMessage(localDeviceId, eepId, manufacturer);

      expect(erp1.sender).toEqual(localDeviceId);
      expect(erp1.getDB(0)).toBe(0x80);
      expect(erp1.getDB(1)).toBe(manufacturer & 0xFF);
      expect(erp1.getDB(2)).toBe(((manufacturer >> 8) & 0x07) | ((eepId.type << 3) & 0xF8));
      expect(erp1.getDB(3)).toBe(((eepId.type >> 5) & 0x03) | ((eepId.func << 2) & 0xFC));
    });

    it('should create a the known FHEM messages ', () => {
      const localDeviceId = EnoCore.DeviceId.fromString('01:02:03:04');
      const eepId = EnoCore.EEPId.fromTriple(0xA5, 0x38, 0x08); // valid func and type
      const manufacturer = EnoCore.Manufacturers.ELTAKO;

      const erp1 = EnoMessageFactory.newFourBSTeachInMessage(localDeviceId, eepId, manufacturer);

      expect(erp1.sender).toEqual(localDeviceId);
      expect(erp1.getDB(0)).toBe(0x80); // LRN bit (0x08) is 0 -> teach-in, 0x80 = LRN TYPE 1 = provide manufacturer ID and EPP
      expect(erp1.getDB(1)).toBe(0x0D); // Pretend Eltako
      expect(erp1.getDB(2)).toBe(0x40); // EEP TYPE 8 >> 1 = 4
      expect(erp1.getDB(3)).toBe(0xE0); // EEP FUNC E0 << 2 = 38
    });
  });

  it('should create a valid ERP1Telegram for switching on', () => {
    const localDeviceId = EnoCore.DeviceId.fromString('01:02:03:04');
    const erp1 = EnoMessageFactory.newFourBSGatewaySwitchingMessage(true);
    erp1.sender = localDeviceId;

    expect(erp1.sender).toEqual(localDeviceId);
    expect(erp1.getDB(0)).toBe(0x09);
    expect(erp1.getDB(1)).toBe(0x00);
    expect(erp1.getDB(2)).toBe(0x00);
    expect(erp1.getDB(3)).toBe(0x01);
  });

  it('should create a valid ERP1Telegram for switching off', () => {
    const localDeviceId = EnoCore.DeviceId.fromString('01:02:03:04');
    const erp1 = EnoMessageFactory.newFourBSGatewaySwitchingMessage(false);
    erp1.sender = localDeviceId;

    expect(erp1.sender).toEqual(localDeviceId);
    expect(erp1.getDB(0)).toBe(0x08);
    expect(erp1.getDB(1)).toBe(0x00);
    expect(erp1.getDB(2)).toBe(0x00);
    expect(erp1.getDB(3)).toBe(0x01);
  });

  it('should create a valid ERP1Telegram for RPS message with on state', () => {
    const localDeviceId = EnoCore.DeviceId.fromString('01:02:03:04');
    const erp1 = EnoMessageFactory.newRpsOnMessage(localDeviceId, true);

    expect(erp1.sender).toEqual(localDeviceId);
    expect(erp1.getDB(0)).toBe(0x50); // DB0.4 Pressed bit for on state
  });

  it('should create a valid ERP1Telegram for RPS message with off state', () => {
    const localDeviceId = EnoCore.DeviceId.fromString('01:02:03:04');
    const erp1 = EnoMessageFactory.newRpsOnMessage(localDeviceId, false);

    expect(erp1.sender).toEqual(localDeviceId);
    expect(erp1.getDB(0)).toBe(0x70); // DB0.4 Pressed bit for off state
  });
});
