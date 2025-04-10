import { EepParser_A5_3F_7F_Eltako } from '../../eepParser/EepParser_A5_3F_7F_Eltako';
import * as EnoCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_A5_3F_7F_Eltako', () => {
  it('should throw an error if an unsupported type is provided', () => {
    expect(() => new EepParser_A5_3F_7F_Eltako(0x01)).toThrow('01: EEP type not supported');
  });

  it('should parse a FOURBS telegram correctly', () => {
    const parser = new EepParser_A5_3F_7F_Eltako(0x7F);
    const telegram = {
      rorg: EnoCore.RORGs.FOURBS,
      getDB: jest.fn()
        .mockReturnValueOnce(0x00) // db0
        .mockReturnValueOnce(0x01) // db1
        .mockReturnValueOnce(0x10) // db2
        .mockReturnValueOnce(0x20), // db3
      toString: jest.fn(),
    } as unknown as EnoCore.ERP1Telegram;

    parser.manufacturerId = EnoCore.Manufacturers.ELTAKO;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.state).toBe('stopped');
    expect(result.values.stoppedAfter_s).toBe(820.8); // (0x2010 * 100 * 1) / 1000
  });

  it('should parse an RPS telegram correctly', () => {
    const parser = new EepParser_A5_3F_7F_Eltako(0x7F);
    const telegram = {
      rorg: EnoCore.RORGs.RPS,
      getDB: jest.fn().mockReturnValueOnce(0x01), // db0
      toString: jest.fn(),
    } as unknown as EnoCore.ERP1Telegram;

    parser.manufacturerId = EnoCore.Manufacturers.ELTAKO;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.state).toBe('up');
  });

  it('should throw an error if the manufacturer is not Eltako', () => {
    const parser = new EepParser_A5_3F_7F_Eltako(0x7F);
    const telegram = {
      rorg: EnoCore.RORGs.RPS,
      getDB: jest.fn().mockReturnValueOnce(0x01), // db0
      toString: jest.fn(),
    } as unknown as EnoCore.ERP1Telegram;

    parser.manufacturerId = EnoCore.Manufacturers.SIEMENS;

    expect(() => parser.parse(telegram)).toThrow('SIEMENS: manufacturer unhandled. Expected Eltako');
  });

  it('should return a string representation of the parsed values', () => {
    const parser = new EepParser_A5_3F_7F_Eltako(0x7F);
    const values = {
      state: 'stopped',
      stoppedAfter_s: 5.5,
    };

    const result = parser.toString(values);

    expect(result).toBe('EepParser_A5_3F_7F_Eltako-7F: state=stopped after 5.5 s');
  });

  it('should handle unknown telegram types gracefully', () => {
    const parser = new EepParser_A5_3F_7F_Eltako(0x7F);
    const telegram = {
      rorg: 0xFF, // Unknown RORG
      getDB: jest.fn().mockReturnValueOnce(0x00), // db0
      toString: jest.fn().mockReturnValue('Unknown telegram'),
    } as unknown as EnoCore.ERP1Telegram;

    parser.manufacturerId = EnoCore.Manufacturers.ELTAKO;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values).toEqual({});
    expect(telegram.toString).toHaveBeenCalled();
  });
});