import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';

/**
  * A5-3F:  4BS - Central Command
  * 
  * Supported:
  * 
  * 7F Gateway
  */
export class EepParser_A5_3F_7F_Eltako extends EepParser {

  private _stateMap: { [key: number]: string } = {
    0x01: 'up',     // state moving up
    0x02: 'down',   // state moving down
    0x70: 'open',   // Fully open
    0x50: 'closed', // Filly closed
  };

  /**
   * Initializes an instance of EepParser_A5_3F_7F
   * @param type the EEP type
   */
  constructor(type: number) {
    super(type);

    // Gateway type 0x7F is supported
    if (type !== 0x7F) {
      throw new Error(`${Util.toHexString(type)}: EEP type not supported`);
    }
  }

  parse(telegram: EnoCore.ERP1Telegram): ParsedMessage {

    const db0 = telegram.getDB(0);

    if (this.manufacturerId !== EnoCore.Manufacturers.ELTAKO) {
      throw new Error(`${EnoCore.Manufacturers[this.manufacturerId]}: manufacturer unhandled. Expected Eltako`);
    }

    // Manufacturer Specific Applications (EEP A5-3F-7F)
    // Not for Eltako FRM60 https://www.google.de/search?q=eltako+FRM60
    // [Eltako shutter TF61J-230V](https://www.google.de/search?q=eltako+TF61J-230V)

    const eep = super.parseBase(telegram);

    switch (telegram.rorg) {
      case EnoCore.RORGs.FOURBS: {
        //const db0 = telegram.getDB(0);  // 0x0A not blocked, 0x0E blocked
        const db1 = telegram.getDB(1);
        const db2 = telegram.getDB(2);
        const db3 = telegram.getDB(3);
        const sign = (db1 === 0x01) ? 1 : (db1 === 0x02) ? -1 : 0;
        const time_ms = (db3 << 8 | db2) * 100 * sign;

        eep.values.state = 'stopped';
        eep.values.stoppedAfter_s = time_ms / 1000;
      } break;

      case EnoCore.RORGs.RPS: {
        eep.values.state = this._stateMap[db0];
      } break;

      default:
        console.log(`${this.constructor.name}: `, telegram.toString());
    }

    return eep;
  }

  toString(values: IParsedValues): string {
    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();
    let msg = `${this.constructor.name}-${type}: state=${values.state}`;
    if (values.stoppedAfter_s) {
      msg += ` after ${values.stoppedAfter_s.toFixed(1)} s`;
    }
    return msg;
  }
}
