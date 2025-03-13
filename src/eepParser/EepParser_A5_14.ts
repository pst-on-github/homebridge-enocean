import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';

/**
 * A5-14:  4BS - Multi-Func Sensor
 *  
 * Supports:
 * 
 * A5-14-09 Window/Door-Sensor with States Open/Closed/Tilt, Supply voltage monitor
 */
export class EepParser_A5_14 extends EepParser {

  private _stateMap: { [key: number]: string } = {
    0x08: 'closed',
    0x0E: 'open',
    0x0A: 'tilt',
  };

  private readonly _limitsOfType: {
    [key: number]: { bMin: number; mB: number; }
  } = {
      // A5-14-09 Window/Door-Sensor with States Open/Closed/Tilt, Supply voltage monitor
      0x09: { bMin: 0, mB: 5.0 / 255 },
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
    const db3 = telegram.getDB(3);

    const state = this._stateMap[db0];

    const vBatt = this._limits.bMin + db3 * this._limits.mB;
    const vLow = 2.0;         // CR2023 Cell
    const vHigh = 3.2;
    const batteryLevel = (vBatt - vLow) * 100 / (vHigh - vLow);

    const eep = super.parseBase(telegram);

    eep.values.state = state;
    eep.values.isContactClosed = state === 'closed';
  
    eep.values.batteryLevel = Math.max(0, Math.min(100, batteryLevel));
    eep.values.isBatteryLow = batteryLevel < 10;

    return eep;
  }
  
  toString(values: IParsedValues): string {

    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();
  
    let msg = `${this.constructor.name}-${type}:  state=${values.state}`;

    if (values.batteryLevel !== undefined) {
      const bLev = values.batteryLevel?.toFixed(0);
      const bLow = values.isBatteryLow;
      msg += `   B=${bLev} % (${bLow ? 'low' : 'ok'})`;
    }

    return msg;
  }
}
