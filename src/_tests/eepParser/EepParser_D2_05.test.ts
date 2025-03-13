import { EepParser_D2_05 } from '../../eepParser/EepParser_D2_05';
import * as EnoCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_D2_05', () => {
  it('should throw an error if the type is not 0x00', () => {
    expect(() => new EepParser_D2_05(0x01)).toThrowError('01: EEP type not supported');
  });

  it('should parse telegram correctly for CMD 4', () => {
    const parser = new EepParser_D2_05(0x00);
    const telegram = {
      getDB: jest.fn()
        .mockReturnValueOnce(0x04) // db0
        .mockReturnValueOnce(0x50) // db2
        .mockReturnValueOnce(0x30), // db3
      rorg: EnoCore.RORGs.VLD,
      userData: { length: 4 },
    } as unknown as EnoCore.ERP1Telegram;

    const parsedMessage: ParsedMessage = parser.parse(telegram);

    expect(parsedMessage.values.currentSlatAngle).toBe(80);
    expect(parsedMessage.values.currentPosition).toBe(48);
  });

  it('should handle slat angle and position of 127 correctly', () => {
    const parser = new EepParser_D2_05(0x00);
    const telegram = {
      getDB: jest.fn()
        .mockReturnValueOnce(0x04) // db0
        .mockReturnValueOnce(0x7F) // db2
        .mockReturnValueOnce(0x7F), // db3
      rorg: EnoCore.RORGs.VLD,
      userData: { length: 4 },
    } as unknown as EnoCore.ERP1Telegram;

    const parsedMessage: ParsedMessage = parser.parse(telegram);

    expect(parsedMessage.values.currentSlatAngle).toBeUndefined();
    expect(parsedMessage.values.currentPosition).toBeUndefined();
  });

  it('should log unexpected command', () => {
    console.log = jest.fn();
    const parser = new EepParser_D2_05(0x00);
    const telegram = {
      getDB: jest.fn()
        .mockReturnValueOnce(0x05) // db0 with unexpected cmd
        .mockReturnValueOnce(0x50) // db2
        .mockReturnValueOnce(0x30), // db3
      rorg: EnoCore.RORGs.VLD,
      userData: { length: 4 },
    } as unknown as EnoCore.ERP1Telegram;

    parser.parse(telegram);

    expect(console.log).toHaveBeenCalledWith('UNEXPECTED D2 cmd', 5);
  });

  it('should log unexpected length', () => {
    console.log = jest.fn();
    const parser = new EepParser_D2_05(0x00);
    const telegram = {
      getDB: jest.fn(),
      rorg: EnoCore.RORGs.VLD,
      userData: { length: 3 }, // unexpected length
    } as unknown as EnoCore.ERP1Telegram;

    parser.parse(telegram);

    expect(console.log).toHaveBeenCalledWith('UNEXPECTED D2 length', 3);
  });

  it('should return correct string representation', () => {
    const parser = new EepParser_D2_05(0x00);
    const values = {
      currentSlatAngle: 50,
      currentPosition: 75,
    };

    const result = parser.toString(values);

    expect(result).toBe('EepParser_D2_05-00: position=75 %   angle=50 %');
  });
});
