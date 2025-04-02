import { EnoMessageFactory } from '../../enocean/EnoMessageFactory';
import * as EnoCore from 'enocean-core';

describe('EnoMessageFactory', () => {
  describe('newFourBSGatewayBlindsMessageEltako', () => {
    it('should create a valid ERP1Telegram for blinds control with up command', () => {
      const cmd = 1; // up
      const time_s = 10; // 10 seconds
      const erp1 = EnoMessageFactory.newFourBSGatewayBlindsMessageEltako(cmd, time_s);

      expect(erp1.getDB(0)).toBe(0x0A); // ms + Datentelegram
      expect(erp1.getDB(1)).toBe(cmd & 0x03); // Command: 0x01 = Up
      expect(erp1.getDB(2)).toBe((time_s * 10) & 0xff); // LSB of time in 100ms
      expect(erp1.getDB(3)).toBe(((time_s * 10) >> 8) & 0xff); // MSB of time in 100ms
    });

    it('should create a valid ERP1Telegram for blinds control with down command', () => {
      const cmd = 2; // down
      const time_s = 5; // 5 seconds
      const erp1 = EnoMessageFactory.newFourBSGatewayBlindsMessageEltako(cmd, time_s);

      expect(erp1.getDB(0)).toBe(0x0A); // ms + Datentelegram
      expect(erp1.getDB(1)).toBe(cmd & 0x03); // Command: 0x02 = Down
      expect(erp1.getDB(2)).toBe((time_s * 10) & 0xff); // LSB of time in 100ms
      expect(erp1.getDB(3)).toBe(((time_s * 10) >> 8) & 0xff); // MSB of time in 100ms
    });
  });

  describe('newFourBSGatewayDimmingMessage', () => {
    it('should create a valid ERP1Telegram for dimming with on state and brightness', () => {
      const on = true;
      const brightness = 75; // 75%
      const erp1 = EnoMessageFactory.newFourBSGatewayDimmingMessage(on, brightness);

      expect(erp1.getDB(0)).toBe(0x09); // On state
      expect(erp1.getDB(1)).toBe(0x01); // Fastest dim speed
      expect(erp1.getDB(2)).toBe(brightness); // Brightness level
      expect(erp1.getDB(3)).toBe(0x02); // Dimming command
    });

    it('should create a valid ERP1Telegram for dimming with off state', () => {
      const on = false;
      const brightness = 50; // 50% (ignored for off state)
      const erp1 = EnoMessageFactory.newFourBSGatewayDimmingMessage(on, brightness);

      expect(erp1.getDB(0)).toBe(0x08); // Off state
      expect(erp1.getDB(1)).toBe(0x01); // Fastest dim speed
      expect(erp1.getDB(2)).toBe(brightness); // Brightness level
      expect(erp1.getDB(3)).toBe(0x02); // Dimming command
    });
  });

  describe('newFourBSGatewaySwitchingMessage', () => {
    it('should create a valid ERP1Telegram for switching on', () => {
      const erp1 = EnoMessageFactory.newFourBSGatewaySwitchingMessage(true);

      expect(erp1.getDB(0)).toBe(0x09); // On state
      expect(erp1.getDB(1)).toBe(0x00); // Time n.a.
      expect(erp1.getDB(2)).toBe(0x00); // Time n.a.
      expect(erp1.getDB(3)).toBe(0x01); // Switching command
    });

    it('should create a valid ERP1Telegram for switching off', () => {
      const erp1 = EnoMessageFactory.newFourBSGatewaySwitchingMessage(false);

      expect(erp1.getDB(0)).toBe(0x08); // Off state
      expect(erp1.getDB(1)).toBe(0x00); // Time n.a.
      expect(erp1.getDB(2)).toBe(0x00); // Time n.a.
      expect(erp1.getDB(3)).toBe(0x01); // Switching command
    });
  });

  describe('newFourBSTeachInMessage', () => {
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
  });

  describe('newRpsOnMessage', () => {
    it('should create a valid ERP1Telegram for RPS message with on state', () => {
      const erp1 = EnoMessageFactory.newRpsOnMessage(true);

      expect(erp1.getDB(0)).toBe(0x50); // DB0.4 Pressed bit for on state
    });

    it('should create a valid ERP1Telegram for RPS message with off state', () => {
      const erp1 = EnoMessageFactory.newRpsOnMessage(false);

      expect(erp1.getDB(0)).toBe(0x70); // DB0.4 Pressed bit for off state
    });
  });

  describe('newVldBlindsControlMessage', () => {
    it('should create a valid ERP1Telegram for blinds control with specific position and angle', () => {
      const cmd = 1; // goto position
      const position = 50; // 50%
      const angle = 30; // 30%
      const erp1 = EnoMessageFactory.newVldBlindsControlMessage(cmd, position, angle);

      expect(erp1.getDB(0)).toBe((0x0F << 4) | (cmd & 0x0F)); // Channel all & command
      expect(erp1.getDB(1)).toBe(0x00); // Repositioning mode & lock
      expect(erp1.getDB(2)).toBe(angle); // Slat angle
      expect(erp1.getDB(3)).toBe(position); // Blinds position
    });

    it('should create a valid ERP1Telegram for blinds control with default values', () => {
      const erp1 = EnoMessageFactory.newVldBlindsControlMessage();

      expect(erp1.getDB(0)).toBe((0x0F << 4) | 1); // Default command: goto position
      expect(erp1.getDB(1)).toBe(0x00); // Default repositioning mode & lock
      expect(erp1.getDB(2)).toBe(127); // Default angle: do not change
      expect(erp1.getDB(3)).toBe(127); // Default position: do not change
    });
  });
});
