/* eslint-disable @typescript-eslint/no-unused-vars */
import { EepParser_A5_38_08 } from '../../eepParser/EepParser_A5_38_08';
import * as EnoCore from 'enocean-core';
import { ParsedMessage } from '../../eepParser/ParsedMessage';

describe('EepParser_A5_38_08', () => {
  it('should throw an error if the type is not 0x08', () => {
    expect(() => new EepParser_A5_38_08(0x09)).toThrowError('09: EEP type not supported');
  });

  it('should parse telegram with state on and alert on', () => {
    const parser = new EepParser_A5_38_08(0x08);
    const telegram = {
      rorg: EnoCore.RORGs.RPS,
      getDB: (index: number) => 0x70,
    } as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isOn).toBe(true);
    expect(result.values.isAlert).toBeUndefined();
  });

  it('should parse telegram with state off and alert off', () => {
    const parser = new EepParser_A5_38_08(0x08);
    const telegram = {
      rorg: EnoCore.RORGs.RPS,
      getDB: (index: number) => 0x50,
    } as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isOn).toBe(false);
    expect(result.values.isAlert).toBeUndefined();
  });

  it('should parse telegram with alert on', () => {
    const parser = new EepParser_A5_38_08(0x08);
    const telegram = {
      rorg: EnoCore.RORGs.RPS,
      getDB: (index: number) => 0x30,
    } as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isOn).toBeUndefined();
    expect(result.values.isAlert).toBe(true);
  });

  it('should parse telegram with alert off', () => {
    const parser = new EepParser_A5_38_08(0x08);
    const telegram = {
      rorg: EnoCore.RORGs.RPS,
      getDB: (index: number) => 0x10,
    } as EnoCore.ERP1Telegram;

    const result: ParsedMessage = parser.parse(telegram);

    expect(result.values.isOn).toBeUndefined();
    expect(result.values.isAlert).toBe(false);
  });

  it('should return correct string representation', () => {
    const parser = new EepParser_A5_38_08(0x08);
    const values = { isOn: true, isAlert: false };

    const result = parser.toString(values);

    expect(result).toBe('EepParser_A5_38_08-08: state:true alert:false');
  });

  /* eslint-disable @typescript-eslint/no-unused-vars */

  describe('EepParser_A5_38_08', () => {
    it('should throw an error if the type is not 0x08', () => {
      expect(() => new EepParser_A5_38_08(0x09)).toThrowError('09: EEP type not supported');
    });

    it('should parse telegram with state on and alert on', () => {
      const parser = new EepParser_A5_38_08(0x08);
      const telegram = {
        rorg: EnoCore.RORGs.RPS,
        getDB: (index: number) => 0x70,
      } as EnoCore.ERP1Telegram;

      const result: ParsedMessage = parser.parse(telegram);

      expect(result.values.isOn).toBe(true);
      expect(result.values.isAlert).toBeUndefined();
    });

    it('should parse telegram with state off and alert off', () => {
      const parser = new EepParser_A5_38_08(0x08);
      const telegram = {
        rorg: EnoCore.RORGs.RPS,
        getDB: (index: number) => 0x50,
      } as EnoCore.ERP1Telegram;

      const result: ParsedMessage = parser.parse(telegram);

      expect(result.values.isOn).toBe(false);
      expect(result.values.isAlert).toBeUndefined();
    });

    it('should parse telegram with alert on', () => {
      const parser = new EepParser_A5_38_08(0x08);
      const telegram = {
        rorg: EnoCore.RORGs.RPS,
        getDB: (index: number) => 0x30,
      } as EnoCore.ERP1Telegram;

      const result: ParsedMessage = parser.parse(telegram);

      expect(result.values.isOn).toBeUndefined();
      expect(result.values.isAlert).toBe(true);
    });

    it('should parse telegram with alert off', () => {
      const parser = new EepParser_A5_38_08(0x08);
      const telegram = {
        rorg: EnoCore.RORGs.RPS,
        getDB: (index: number) => 0x10,
      } as EnoCore.ERP1Telegram;

      const result: ParsedMessage = parser.parse(telegram);

      expect(result.values.isOn).toBeUndefined();
      expect(result.values.isAlert).toBe(false);
    });

    it('should parse 4BS telegram with dimming command', () => {
      const parser = new EepParser_A5_38_08(0x08);
      const telegram = {
        rorg: EnoCore.RORGs.FOURBS,
        getDB: (index: number) => {
          const db = [0x01, 0x00, 0x64, 0x02]; // Example data
          return db[index];
        },
      } as EnoCore.ERP1Telegram;

      const result: ParsedMessage = parser.parse(telegram);

      expect(result.values.isOn).toBe(true);
      expect(result.values.brightness).toBe(0x64);
    });

    it('should parse 4BS telegram with data message and confirmed local ID', () => {
      const parser = new EepParser_A5_38_08(0x08);
      const telegram = {
        rorg: EnoCore.RORGs.FOURBS,
        getDB: (index: number) => {
          const db = [0x08, 0x07, 0x2D, 0x9E]; // Example data
          return db[index];
        },
      } as EnoCore.ERP1Telegram;

      const result: ParsedMessage = parser.parse(telegram);

      expect(result.values.eltakoMsc).toBeDefined();
      expect(result.values.eltakoMsc?.confirmedLocalId?.toString()).toBe('00:9E:2D:07');
    });

    it('should return correct string representation', () => {
      const parser = new EepParser_A5_38_08(0x08);
      const values = { isOn: true, isAlert: false, brightness: 100 };

      const result = parser.toString(values);

      expect(result).toBe('EepParser_A5_38_08-08: state:true brightness:100 alert:false');
    });
  });
});