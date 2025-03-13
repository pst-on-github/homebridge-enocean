import { EepParser_A5_04 } from '../../eepParser/EepParser_A5_04';
import * as EnoCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_A5_04', () => {
  it('should initialize with valid type', () => {
    const parser = new EepParser_A5_04(0x01);
    expect(parser).toBeInstanceOf(EepParser_A5_04);
  });

  it('should throw error for unsupported type', () => {
    expect(() => new EepParser_A5_04(0x03)).toThrowError('03: EEP type not supported');
  });

  it('should parse telegram correctly for type 0x01', () => {
    const parser = new EepParser_A5_04(0x01);
    const telegram = {
      getDB: (index: number) => {
        switch (index) {
          case 1: return 125; // temperature
          case 2: return 125; // humidity
          case 3: return 0;   // voltage
          default: return 0;
        }
      },
      status: 0,
      rorg: EnoCore.RORGs.FOURBS,
    } as EnoCore.ERP1Telegram;

    const result = parser.parse(telegram);
    expect(result.values.temperature).toBeCloseTo(20);
    expect(result.values.relativeHumidity).toBeCloseTo(50);
  });

  it('should parse telegram correctly for type 0x02 with Eltako manufacturer', () => {
    const parser = new EepParser_A5_04(0x02);
    parser.manufacturerId = EnoCore.Manufacturers.ELTAKO;
    const telegram = {
      getDB: (index: number) => {
        switch (index) {
          case 1: return 125; // temperature
          case 2: return 125; // humidity
          case 3: return 150; // voltage
          default: return 0;
        }
      },
      status: 0,
      rorg: EnoCore.RORGs.FOURBS,
    } as EnoCore.ERP1Telegram;

    const result = parser.parse(telegram);
    expect(result.values.temperature).toBeCloseTo(20);
    expect(result.values.relativeHumidity).toBeCloseTo(50);
    expect(result.values.batteryLevel).toBeCloseTo(39.2, 1);
    expect(result.values.isBatteryLow).toBe(false);
  });

  it('should return correct string representation', () => {
    const parser = new EepParser_A5_04(0x02);
    parser.manufacturerId = EnoCore.Manufacturers.ELTAKO;
    const values = {
      temperature: 20,
      relativeHumidity: 50,
      batteryLevel: 88.24,
      isBatteryLow: false,
    } as ParsedMessage['values'];

    const result = parser.toString(values);
    expect(result).toBe('EepParser_A5_04-02: T=20.0 °C   rH=50 %   B=88 % (ok)');
  });
});