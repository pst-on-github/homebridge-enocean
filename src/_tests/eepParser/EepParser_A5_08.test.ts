import { EepParser_A5_08 } from '../../eepParser/EepParser_A5_08';
import * as EnoCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_A5_08', () => {
  it('should throw an error for unsupported EEP type', () => {
    expect(() => new EepParser_A5_08(0x04)).toThrowError('04: EEP type not supported');
  });

  it('should parse telegram correctly for type 0x01', () => {
    const parser = new EepParser_A5_08(0x01);
    const telegram = new EnoCore.ERP1Telegram({ rorg: 0xA5 });

    jest.spyOn(telegram, 'getDB').mockImplementation((index: number) => {
      switch (index) {
        case 0: return 0x02;
        case 1: return 0x80;
        case 2: return 0x80;
        case 3: return 0xB0;
        default: return 0x00;
      }
    });

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isMotionDetected).toBe(false);
    expect(result.values.isOccupancyDetected).toBe(true);
    expect(result.values.temperature).toBeCloseTo(25.6, 1);
    expect(result.values.ambientLightLevel).toBe(256);
    expect(result.values.batteryLevel).toBeCloseTo(48.2, 1);
    expect(result.values.isBatteryLow).toBe(false);
  });

  it('should parse telegram correctly for type 0x02', () => {
    const parser = new EepParser_A5_08(0x02);
    const telegram = new EnoCore.ERP1Telegram({ rorg: 0xA5 });

    jest.spyOn(telegram, 'getDB').mockImplementation((index: number) => {
      switch (index) {
        case 0: return 0x01;
        case 1: return 0xFF;
        case 2: return 0xFF;
        case 3: return 0xFF;
        default: return 0x00;
      }
    });

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isMotionDetected).toBe(true);
    expect(result.values.isOccupancyDetected).toBe(false);
    expect(result.values.temperature).toBeCloseTo(51.0, 1);
    expect(result.values.ambientLightLevel).toBe(1020);
    expect(result.values.batteryLevel).toBeCloseTo(100, 2);
    expect(result.values.isBatteryLow).toBe(false);
  });

  it('should parse telegram correctly for type 0x03', () => {
    const parser = new EepParser_A5_08(0x03);
    const telegram = new EnoCore.ERP1Telegram({ rorg: 0xA5 });

    jest.spyOn(telegram, 'getDB').mockImplementation((index: number) => {
      switch (index) {
        case 0: return 0x00;
        case 1: return 0x00;
        case 2: return 0x00;
        case 3: return 0x00;
        default: return 0x00;
      }
    });

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isMotionDetected).toBe(true);
    expect(result.values.isOccupancyDetected).toBe(true);
    expect(result.values.temperature).toBeCloseTo(-30.0, 1);
    expect(result.values.ambientLightLevel).toBe(0);
    expect(result.values.batteryLevel).toBeCloseTo(0, 2);
    expect(result.values.isBatteryLow).toBe(true);
  });

  it('should return correct string representation', () => {
    const parser = new EepParser_A5_08(0x01);
    const values = {
      temperature: 25.5,
      ambientLightLevel: 300,
      batteryLevel: 75,
      isBatteryLow: false,
      isOccupancyDetected: true,
      isMotionDetected: false,
    };

    const result = parser.toString(values);
    expect(result).toBe('EepParser_A5_08-01:  E=300 lx   T=25.5 °C   B=75 % (ok)   OCCUPANCY');
  });
});