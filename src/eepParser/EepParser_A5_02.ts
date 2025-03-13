import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';

/**
 * A5-02:  4BS - Temperature Sensors
 *
 * Supported type:
 * 
 * 01-0B, 10-19, 1A, 1B
 */
export class EepParser_A5_02 extends EepParser {

  private _limitsOfType: { [key: number]: { max: number; m: number } } = {
    0x01: { max: 0, m: 255 / 40 },    // TYPE 01 Temperature Sensor Range -40°C to   0°C
    0x02: { max: 10, m: 255 / 40 },   // TYPE 02 Temperature Sensor Range -30°C to  10°C
    0x03: { max: 20, m: 255 / 40 },   // TYPE 03 Temperature Sensor Range -20°C to  20°C
    0x04: { max: 30, m: 255 / 40 },   // TYPE 04 Temperature Sensor Range -10°C to  30°C
    0x05: { max: 40, m: 255 / 40 },   // TYPE 05 Temperature Sensor Range   0°C to  40°C
    0x06: { max: 50, m: 255 / 40 },   // TYPE 06 Temperature Sensor Range  10°C to  50°C
    0x07: { max: 60, m: 255 / 40 },   // TYPE 07 Temperature Sensor Range  20°C to  60°C
    0x08: { max: 70, m: 255 / 40 },   // TYPE 08 Temperature Sensor Range  30°C to  70°C
    0x09: { max: 80, m: 255 / 40 },   // TYPE 09 Temperature Sensor Range  40°C to  80°C
    0x0A: { max: 90, m: 255 / 40 },   // TYPE 0A Temperature Sensor Range  50°C to  90°C
    0x0B: { max: 100, m: 255 / 40 },  // TYPE 0B Temperature Sensor Range  60°C to 100°C
    0x10: { max: 20, m: 255 / 80 },   // TYPE 0C Temperature Sensor Range -60°C to  20°C
    0x11: { max: 30, m: 255 / 80 },   // TYPE 0D Temperature Sensor Range -50°C to  30°C
    0x12: { max: 40, m: 255 / 80 },   // TYPE 0E Temperature Sensor Range -40°C to  40°C
    0x13: { max: 50, m: 255 / 80 },   // TYPE 0F Temperature Sensor Range -30°C to  50°C
    0x14: { max: 60, m: 255 / 80 },   // TYPE 10 Temperature Sensor Range -20°C to  60°C
    0x15: { max: 70, m: 255 / 80 },   // TYPE 11 Temperature Sensor Range -10°C to  70°C
    0x16: { max: 80, m: 255 / 80 },   // TYPE 12 Temperature Sensor Range   0°C to  80°C
    0x17: { max: 90, m: 255 / 80 },   // TYPE 13 Temperature Sensor Range  10°C to  90°C
    0x18: { max: 100, m: 255 / 80 },  // TYPE 14 Temperature Sensor Range  20°C to 100°C
    0x19: { max: 110, m: 255 / 80 },  // TYPE 15 Temperature Sensor Range  30°C to 110°C
    0x1A: { max: 120, m: 255 / 80 },  // TYPE 16 Temperature Sensor Range  40°C to 120°C
    0x1B: { max: 130, m: 255 / 80 },  // TYPE 17 Temperature Sensor Range  50°C to 130°C

    0x20: { max: 41.2, m: 1024 / 51.2 },  // TYPE 20 Temperature Sensor Range -10°C to 41.2°C (10bit)
    0x30: { max: 62.3, m: 1024 / 102.3 }, // TYPE 30 Temperature Sensor Range -40°C to 62.3°C (10bit)
  };

  private _limits;

  /**
   * Initializes an instance of EepParser_A5_02
   * @param type the EEP type
   */
  constructor(type: number) {
    super(type);

    if (type in this._limitsOfType) {
      this._limits = this._limitsOfType[type];
    } else {
      throw new Error(`${Util.toHexString(type)}: EEP type not supported`);
    }
  }

  parse(telegram: EnoCore.ERP1Telegram): ParsedMessage {

    this.assertROrg(EnoCore.RORGs.FOURBS, telegram);

    const db1 = telegram.getDB(1);
    const db2 = telegram.getDB(2);

    const value = (this.eepType & 0x20) === 0x20
      ? ((db2 & 0x03) << 8) | db1   // 10 bit
      : db1;                        //  8 bit

    const eep = super.parseBase(telegram);
    eep.values.temperature = this._limits.max - value / this._limits.m;
    return eep;
  }

  toString(values: IParsedValues): string {
    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();
    const temp = values.temperature?.toFixed(1);
    return `${this.constructor.name}-${type}: T=${temp} °C`;
  }
}
