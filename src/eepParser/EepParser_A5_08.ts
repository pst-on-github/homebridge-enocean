import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';

/*
  * A5-08:  4BS - Light, Temperature and Occupancy Sensor
  * 
  * Supported types:
  * 
  * 01 Range 0lx to 510lx, 0°C to +51°C and Occupancy Button
  * 02 Range 0lx to 1020lx, 0°C to +51°C and Occupancy Button
  * 03 Range 0lx to 1530lx, -30°C to +50°C and Occupancy Button
  */
export class EepParser_A5_08 extends EepParser {

  private readonly _limitsOfType: {
    [key: number]: { tMin: number; mT: number; lMin: number; mL: number; bMin: number; mB: number; }
  } = {
      // A5-08-01 Range 0lx to 510lx, 0°C to +51°C and Occupancy Button
      0x01: { tMin: 0, mT: 51 / 255, lMin: 0, mL: 510 / 255, bMin: 0, mB: 5.1 / 255 },
      // A5-08-02 Range 0lx to 1020lx, 0°C to +51°C and Occupancy Button
      0x02: { tMin: 0, mT: 51 / 255, lMin: 0, mL: 1020 / 255, bMin: 0, mB: 5.1 / 255 },
      // A5-08-03 Range 0lx to 1530lx, -30°C to +50°C and Occupancy Button
      0x03: { tMin: -30, mT: 50 / 255, lMin: 0, mL: 1530 / 255, bMin: 0, mB: 5.1 / 255 },
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

    const db0 = telegram.getDB(0);
    const db1 = telegram.getDB(1);
    const db2 = telegram.getDB(2);
    const db3 = telegram.getDB(3);

    const eep = super.parseBase(telegram);

    eep.values.isMotionDetected = (db0 & 0x02) === 0;

    if (this.manufacturerId !== EnoCore.Manufacturers.ELTAKO) {
      eep.values.isOccupancyDetected = (db0 & 0x01) === 0;
      eep.values.temperature = this._limits.tMin + db1 * this._limits.mT;
    }

    // Extended range from Eltako
    const mL = (this.manufacturerId === EnoCore.Manufacturers.ELTAKO) ? 2048 / 255 : this._limits.mL;
    eep.values.ambientLightLevel = Math.round(this._limits.lMin + db2 * mL);

    const vBatt = this._limits.bMin + db3 * this._limits.mB;
    const vLow = 2.7;   // From FHEM ELTAKO FABH65S
    const vHigh = 4.4;

    const batteryLevel = (vBatt - vLow) * 100 / (vHigh - vLow);
    eep.values.batteryLevel = Math.max(0, Math.min(100, batteryLevel));
    eep.values.isBatteryLow = batteryLevel < 10;

    return eep;
  }

  toString(values: IParsedValues): string {

    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();
    const temp = values.temperature?.toFixed(1);
    const alev = values.ambientLightLevel?.toFixed(0);

    let msg = `${this.constructor.name}-${type}:  E=${alev} lx`;
    if (temp !== undefined) {
      msg += `   T=${temp} °C`;
    }

    if (values.batteryLevel !== undefined) {
      const bLev = values.batteryLevel?.toFixed(0);
      const bLow = values.isBatteryLow;
      msg += `   B=${bLev} % (${bLow ? 'low' : 'ok'})`;
    }
      
    if (values.isOccupancyDetected) {
      msg += '   OCCUPANCY';
    } else if (values.isMotionDetected) {
      msg += '   MOTION';
    }

    return msg;
  }
}
