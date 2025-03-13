/* eslint-disable curly */
import { EepParser_A5_14 } from '../../eepParser/EepParser_A5_14';
import * as EnoCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_A5_14', () => {
  let parser: EepParser_A5_14;

  beforeEach(() => {
    parser = new EepParser_A5_14(0x09);
  });

  it('should parse a closed state correctly', () => {
    const telegram = new EnoCore.ERP1Telegram({ rorg: 0xA5 });
    jest.spyOn(telegram, 'getDB').mockImplementation((index: number) => {
      if (index === 0) return 0x08;
      if (index === 3) return 0xFF;
      return 0;
    });

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.state).toBe('closed');
    expect(result.values.isContactClosed).toBe(true);
    expect(result.values.batteryLevel).toBeCloseTo(100);
    expect(result.values.isBatteryLow).toBe(false);
  });

  it('should parse an open state correctly', () => {
    const telegram = new EnoCore.ERP1Telegram({ rorg: 0xA5 });
    jest.spyOn(telegram, 'getDB').mockImplementation((index: number) => {
      if (index === 0) return 0x0E;
      if (index === 3) return 0x80;
      return 0;
    });

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.state).toBe('open');
    expect(result.values.isContactClosed).toBe(false);
    expect(result.values.batteryLevel).toBeCloseTo(42.5, 1);
    expect(result.values.isBatteryLow).toBe(false);
  });

  it('should parse a tilt state correctly', () => {
    const telegram = new EnoCore.ERP1Telegram({ rorg: 0xA5 });
    jest.spyOn(telegram, 'getDB').mockImplementation((index: number) => {
      if (index === 0) return 0x0A;
      if (index === 3) return 0x00;
      return 0;
    });

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.state).toBe('tilt');
    expect(result.values.isContactClosed).toBe(false);
    expect(result.values.batteryLevel).toBeCloseTo(0);
    expect(result.values.isBatteryLow).toBe(true);
  });

  it('should throw an error for unsupported EEP type', () => {
    expect(() => new EepParser_A5_14(0xFF)).toThrowError('FF: EEP type not supported');
  });

  it('should return correct string representation', () => {
    const values = {
      state: 'open',
      isContactClosed: false,
      batteryLevel: 75,
      isBatteryLow: false,
    };

    const result = parser.toString(values);

    expect(result).toBe('EepParser_A5_14-09:  state=open   B=75 % (ok)');
  });
});