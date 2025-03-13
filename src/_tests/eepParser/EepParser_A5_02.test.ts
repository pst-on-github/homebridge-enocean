import { EepParser_A5_02 } from '../../eepParser/EepParser_A5_02';
import * as EnoCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_A5_02', () => {
  it('should throw an error for unsupported EEP type', () => {
    expect(() => new EepParser_A5_02(0x99)).toThrow('99: EEP type not supported');
  });

  it('should parse temperature correctly for 8-bit type', () => {
    const parser = new EepParser_A5_02(0x01);
    const telegram = {
      getDB: (index: number) => (index === 1 ? 0x80 : 0x00),
      rorg: EnoCore.RORGs.FOURBS,
    } as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);
    expect(result.values.temperature).toBeCloseTo(-20.1, 1);
  });

  it('should parse temperature correctly for 10-bit type', () => {
    const parser = new EepParser_A5_02(0x20);
    const telegram = {
      getDB: (index: number) => (index === 1 ? 0x80 : 0x02),
      rorg: EnoCore.RORGs.FOURBS,
    } as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);
    expect(result.values.temperature).toBeCloseTo(9.2, 1);
  });

  it('should return correct string representation', () => {
    const parser = new EepParser_A5_02(0x01);
    const values = { temperature: -20 };
    const result = parser.toString(values);
    expect(result).toBe('EepParser_A5_02-01: T=-20.0 °C');
  });
});