import { EepParser_A5_10 } from '../../eepParser/EepParser_A5_10';
import * as EnoCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_A5_10', () => {
  it('should initialize correctly with a supported type', () => {
    const parser = new EepParser_A5_10(0x0B);
    expect(parser).toBeInstanceOf(EepParser_A5_10);
  });

  it('should throw an error for unsupported types', () => {
    expect(() => new EepParser_A5_10(0x01)).toThrowError('01: EEP type not supported');
  });

  it('should parse a valid telegram correctly', () => {
    const parser = new EepParser_A5_10(0x0B);

    const mockTelegram = {
      getDB: jest.fn((index: number) => {
        if (index === 0) {
          return 0x01;  // Contact open
        }
        if (index === 1) {
          return 128;   // Mid-range temperature
        }
        return 0;
      }),
      rorg: EnoCore.RORGs.FOURBS,
    } as unknown as EnoCore.ERP1Telegram;

    const parsedMessage: ParsedMessage = parser.parse(mockTelegram);

    expect(parsedMessage.values.isContactClosed).toBe(false);
    expect(parsedMessage.values.temperature).toBeCloseTo(19.9, 1); // 40 + 128 * (-40 / 255)
  });

  it('should throw an error if telegram RORG is invalid', () => {
    const parser = new EepParser_A5_10(0x0B);

    const mockTelegram = {
      getDB: jest.fn(),
      rorg: 0x00, // Invalid RORG
    } as unknown as EnoCore.ERP1Telegram;

    expect(() => parser.parse(mockTelegram)).toThrowError('undefined: unexpected RORG. Expected FOURBS');
  });

  it('should generate a correct string representation', () => {
    const parser = new EepParser_A5_10(0x0B);

    const values = {
      temperature: 22.5,
      isContactClosed: true,
    };

    const result = parser.toString(values);
    expect(result).toBe('EepParser_A5_10-0B: T=22.5 °C CLOSED');
  });

  it('should handle NOT CLOSED state in string representation', () => {
    const parser = new EepParser_A5_10(0x0B);

    const values = {
      temperature: 18.3,
      isContactClosed: false,
    };

    const result = parser.toString(values);
    expect(result).toBe('EepParser_A5_10-0B: T=18.3 °C NOT CLOSED');
  });
});