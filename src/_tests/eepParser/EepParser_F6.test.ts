import { EepParser_F6 } from '../../eepParser/EepParser_F6';
import * as EnoceanCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_F6', () => {
  let parser: EepParser_F6;

  beforeEach(() => {
    parser = new EepParser_F6(0x02);
  });

  it('should parse a pressed button correctly', () => {
    const telegram = {
      getDB: jest.fn().mockReturnValue(0b00010000), // AI button pressed
      status: 0,
      rorg: EnoceanCore.RORGs.RPS,
    } as unknown as EnoceanCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.state).toBe('AI');
    expect(result.values.isPressed).toBe(true);
    expect(result.values.isContactClosed).toBe(true);
    expect(result.values.buttons).toEqual(['AI']);
  });

  it('should parse a released button correctly', () => {
    const telegram = {
      getDB: jest.fn().mockReturnValue(0b00000000), // No button pressed
      status: 0,
      rorg: EnoceanCore.RORGs.RPS,
    } as unknown as EnoceanCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.state).toBe('released');
    expect(result.values.isPressed).toBe(false);
    expect(result.values.isContactClosed).toBe(false);
    expect(result.values.buttons).toEqual([]);
  });

  it('should parse multiple buttons correctly', () => {
    const telegram = {
      getDB: jest.fn().mockReturnValue(0b00010101), // AI and BI buttons pressed
      status: 0,
      rorg: EnoceanCore.RORGs.RPS,
    } as unknown as EnoceanCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.state).toBe('AI, BI');
    expect(result.values.isPressed).toBe(true);
    expect(result.values.isContactClosed).toBe(true);
    expect(result.values.buttons).toEqual(['AI', 'BI']);
  });

  it('should return correct string representation', () => {
    const values = {
      state: 'AI',
      isContactClosed: true,
    } as unknown as ParsedMessage['values'];

    const result = parser.toString(values);

    expect(result).toBe('EepParser_F6-02: state:AI isContactClosed:true');
  });
});