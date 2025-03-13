import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';

/**
  * A5-30:  4BS - Digital Input
  * 
  * Supports:
  * 
  * ./.
  */
export class EepParser_A5_30 extends EepParser {

  /**
   * Initializes an instance of EepParser_A5_30
   * @param type the EEP type
   */
  constructor(type: number) {
    super(type);
  }

  parse(telegram: EnoCore.ERP1Telegram): ParsedMessage {

    this.assertROrg(EnoCore.RORGs.FOURBS, telegram);

    const eep = super.parseBase(telegram);

    const db1 = telegram.getDB(1);
    eep.values.isContactClosed = db1 < 196;

    if (this.eepType === 1) {  // Has battery monitor

      const db2 = telegram.getDB(2);
      eep.values.isBatteryLow = db2 < 121;
    }

    return eep;
  }

  toString(values: IParsedValues): string {
    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();
    return `${this.constructor.name}-${type}: ${values.isContactClosed ? 'CLOSED' : 'NOT CLOSED'}   B=${values.isBatteryLow ? 'low' : 'ok'}`;
  }
}
