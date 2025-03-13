import * as EnoCore from 'enocean-core';
import { DeviceConfig } from '../../homebridge/DeviceConfig';

describe('DeviceConfig', () => {
  it('should create an instance', () => {
    const dc = new DeviceConfig('11:22:33:44', 'A5-10-05', 'Boogie');
    expect(dc).toBeTruthy();
    expect(dc.manufacturer).toBe('Reserved');
    expect(dc.manufacturerId).toBe(0);
    expect(dc.manufacturerId).toBe(EnoCore.Manufacturers.Reserved);
    expect(dc.model).toBe('A5-10-05');
  });

  it('should create an instance (Eltako)', () => {
    const dc = new DeviceConfig('11:22:33:44', 'A5-10-05', 'Boogie', 'Eltako', 'Walk');
    expect(dc).toBeTruthy();
    expect(dc.manufacturer).toBe('Eltako');
    expect(dc.manufacturerId).toBe(13);
    expect(dc.manufacturerId).toBe(EnoCore.Manufacturers.ELTAKO);
    expect(EnoCore.Manufacturers.ELTAKO).toBe(13);
    expect(dc.model).toBe('Walk');
  });

  describe('DeviceConfig', () => {
    it('should create an instance', () => {
      const dc = new DeviceConfig('11:22:33:44', 'A5-10-05', 'Boogie');
      expect(dc).toBeTruthy();
      expect(dc.manufacturer).toBe('Reserved');
      expect(dc.manufacturerId).toBe(0);
      expect(dc.manufacturerId).toBe(EnoCore.Manufacturers.Reserved);
      expect(dc.model).toBe('A5-10-05');
    });

    it('should create an instance (Eltako)', () => {
      const dc = new DeviceConfig('11:22:33:44', 'A5-10-05', 'Boogie', 'Eltako', 'Walk');
      expect(dc).toBeTruthy();
      expect(dc.manufacturer).toBe('Eltako');
      expect(dc.manufacturerId).toBe(13);
      expect(dc.manufacturerId).toBe(EnoCore.Manufacturers.ELTAKO);
      expect(EnoCore.Manufacturers.ELTAKO).toBe(13);
      expect(dc.model).toBe('Walk');
    });

    it('should default name if not provided', () => {
      const dc = new DeviceConfig('11:22:33:44', 'A5-10-05');
      expect(dc.name).toBe('EnOcean A5-10-05');
    });

    it('should default manufacturer to Reserved if not provided', () => {
      const dc = new DeviceConfig('11:22:33:44', 'A5-10-05');
      expect(dc.manufacturer).toBe('Reserved');
      expect(dc.manufacturerId).toBe(EnoCore.Manufacturers.Reserved);
    });

    it('should default model to eepId if not provided', () => {
      const dc = new DeviceConfig('11:22:33:44', 'A5-10-05');
      expect(dc.model).toBe('A5-10-05');
    });

    it('should handle unknown manufacturer gracefully', () => {
      const dc = new DeviceConfig('11:22:33:44', 'A5-10-05', 'Boogie', 'UnknownManufacturer');
      expect(dc.manufacturer).toBe('UnknownManufacturer');
      expect(dc.manufacturerId).toBe(EnoCore.Manufacturers.Reserved);
    });
  });
});
