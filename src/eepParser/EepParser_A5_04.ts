import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';

/**
  * A5-02:  4BS - Temperature Sensors
  * 
  * Supported types:
  * 
  * 01 Range 0°C to +40°C and 0% to 100%
  * 02 Range -20°C to +60°C and 0% to 100%, Eltako supports battery properties
  * 
  */
export class EepParser_A5_04 extends EepParser {

  private readonly _limitsOfType: { [key: number]: { tMin: number; m: number } } = {
    0x01: { tMin: 0, m: 40 / 250 },     // TYPE 01 Range 0°C to +40°C and 0% to 100%
    0x02: { tMin: -20, m: 80 / 250 },   // TYPE 02 Range -20°C to +60°C and 0% to 100%, Eltako supports battery properties
  };

  private readonly _limits;

  /**
   * Initializes an instance of EepParser_A5_04
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

    // repeaterCount = telegram.status & 0x0F;

    const db1 = telegram.getDB(1);
    const db2 = telegram.getDB(2);
    const db3 = telegram.getDB(3);

    // Temperature and Humidity Sensor(EEP A5-04-02)
    // [Eltako FAFT60, FIFT63AP]
    // db3 is the voltage where 0x59 = 2.5V ... 0x9B = 4V, Eltako only
    // db2 is the humidity where 0x00 = 0%rH ... 0xFA = 100%rH
    // db1 is the temperature where 0x00 = -20°C ... 0xFA = +60°C

    const eep = super.parseBase(telegram);

    eep.values.relativeHumidity = db2 / 2.5;
    eep.values.temperature = this._limits.tMin + db1 * this._limits.m;

    if (this.manufacturerId === EnoCore.Manufacturers.ELTAKO && db3 > 0) {

      const vBatt = db3 * 6.58 / 255;
      const vLow = 3.4;                 // From FHEM ELTAKO FAFT60 
      const vHigh = 4.6;

      const batteryLevel = (vBatt - vLow) * 100 / (vHigh - vLow);

      eep.values.batteryLevel = Math.max(0, Math.min(100, batteryLevel));
      eep.values.isBatteryLow = batteryLevel < 10;
    }

    return eep; 
  }

  toString(values: IParsedValues): string {

    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();
    const temp = values.temperature?.toFixed(1);
    const rhum = values.relativeHumidity?.toFixed(0);

    let msg = `${this.constructor.name}-${type}: T=${temp} °C   rH=${rhum} %`;

    if (this.manufacturerId === EnoCore.Manufacturers.ELTAKO) {
      const bLev = values.batteryLevel?.toFixed(0);
      const bLow = values.isBatteryLow;

      msg += `   B=${bLev} % (${bLow ? 'low' : 'ok'})`;
    }

    return msg;
  }
}
