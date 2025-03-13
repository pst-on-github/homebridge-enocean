import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';

/**
  * D2-05:  VLD - Blinds Control for Position & Angle
  * 
  * Supported:
  * 
  * TYPE 00
  */
export class EepParser_D2_05 extends EepParser {

  /**
   * Initializes an instance of EepParser_D2_05
   * @param type the EEP type
   */
  constructor(type: number) {
    super(type);

    // Type 0x00 is supported
    if (type !== 0x00) {
      throw new Error(`${Util.toHexString(type)}: EEP type not supported`);
    }
  }

  parse(telegram: EnoCore.ERP1Telegram): ParsedMessage {

    this.assertROrg(EnoCore.RORGs.VLD, telegram);

    const eep = super.parseBase(telegram);

    if (telegram.userData.length === 4) {
      const db0 = telegram.getDB(0);
      const db2 = telegram.getDB(2);
      const db3 = telegram.getDB(3);


      const cmd = db0 & 0x0F;
      //const ch = (db0 & 0xF0) >> 4;

      if (cmd === 4) { // CMD 4 - Reply Position and Angle
        // const lockingMode = db1 & 0x07;
        const slatAngle = db2 & 0x7F;
        if (slatAngle !== 127) {
          eep.values.currentSlatAngle = Math.min(slatAngle, 100);
        }
        const position = db3 & 0x7F;
        if (position !== 127) {
          eep.values.currentPosition = Math.min(position, 100);
        }
      } else {
        console.log('UNEXPECTED D2 cmd', cmd);
      }
    } else {
      console.log('UNEXPECTED D2 length', telegram.userData.length);
    }

    return eep;
  }

  toString(values: IParsedValues): string {
    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();
    return `${this.constructor.name}-${type}: position=${values.currentPosition} %   angle=${values.currentSlatAngle} %`;
  }
}
