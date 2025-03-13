import * as EnoceanCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';


/**
 * RPS - Rocker Switches
 * 
 * Supports:
 * 
 * Multiple types
 */
export class EepParser_F6 extends EepParser {

  /**
   * Initializes an instance of EepParser_F6_02
   * @param type the EEP type
   */
  constructor(type: number) {
    super(type);
  }

  parse(telegram: EnoceanCore.ERP1Telegram): ParsedMessage {

    this.assertROrg(EnoceanCore.RORGs.RPS, telegram);

    const ptm200Buttons: string[] = ['AI', 'A0', 'BI', 'B0', 'CI', 'C0', 'DI', 'D0'];

    // let nu = (telegram.status & 0x10) !== 0;
    // let t21 = (telegram.status & 0x20) !== 0;
    // let repeaterCount = telegram.status & 0x0F;

    // T21 = 0 = PTM switch module of type 1 / synonymous for module PTM1xx
    // T21 = 1 = PTM switch module of type 2 / synonymous for module PTM2xx
    // NU  = 1 = N-message (N = normal) 
    // NU  = 0 = U-message (U = unassigned)

    const db0 = telegram.getDB(0);
    const isSecond = (db0 & 0x01) === 0x01;
    const isPressed = (db0 & 0x10) === 0x10;

    let state = '';
    const buttons: string[] = [];

    if (isPressed) {
      buttons.push(ptm200Buttons[(db0 & 0xe0) >> 5]);
      if (isSecond) {
        buttons.push(ptm200Buttons[(db0 & 0x0e) >> 1]);
      }
      state = buttons.join(', ');
    } else {
      state = 'released';
    }

    const eep = this.parseBase(telegram);

    eep.values.state = state;
    eep.values.isPressed = isPressed;
    eep.values.isContactClosed = isPressed;
    eep.values.buttons = [...buttons];

    return eep;
  }

  toString(values: IParsedValues): string {
    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();
    return `${this.constructor.name}-${type}: state:${values.state} isContactClosed:${values.isContactClosed}`;
  }
}
