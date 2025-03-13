import * as EnoCore from 'enocean-core';
import { EepParser_A5_30 } from '../../eepParser/EepParser_A5_30';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_A5_30', () => {
  let parser: EepParser_A5_30;

  beforeEach(() => {
    parser = new EepParser_A5_30(0);
  });

  it('should parse telegram with contact closed and no battery monitor', () => {
    const telegram = {
      getDB: jest.fn((index: number) => {
        if (index === 1) {
          return 195;
        }
        return 0;
      }),
      rorg: EnoCore.RORGs.FOURBS,
    } as unknown as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isContactClosed).toBe(true);
    expect(result.values.isBatteryLow).toBeUndefined();
  });

  it('should parse telegram with contact not closed and no battery monitor', () => {
    const telegram = {
      getDB: jest.fn((index: number) => {
        if (index === 1) {
          return 196;
        }
        return 0;
      }),
      rorg: EnoCore.RORGs.FOURBS,
    } as unknown as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isContactClosed).toBe(false);
    expect(result.values.isBatteryLow).toBeUndefined();
  });

  it('should parse telegram with contact closed and battery low', () => {
    parser = new EepParser_A5_30(1);
    const telegram = {
      getDB: jest.fn((index: number) => {
        if (index === 1) {
          return 195;
        }
        if (index === 2) {
          return 120;
        }
        return 0;
      }),
      rorg: EnoCore.RORGs.FOURBS,
    } as unknown as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isContactClosed).toBe(true);
    expect(result.values.isBatteryLow).toBe(true);
  });

  it('should parse telegram with contact closed and battery ok', () => {
    parser = new EepParser_A5_30(1);
    const telegram = {
      getDB: jest.fn((index: number) => {
        if (index === 1) {
          return 195;
        }
        if (index === 2) {
          return 121;
        }
        return 0;
      }),
      rorg: EnoCore.RORGs.FOURBS,
    } as unknown as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isContactClosed).toBe(true);
    expect(result.values.isBatteryLow).toBe(false);
  });

  it('should return correct string representation', () => {
    const values = {
      isContactClosed: true,
      isBatteryLow: false,
    };

    const result = parser.toString(values);

    expect(result).toBe('EepParser_A5_30-00: CLOSED   B=ok');
  });
});