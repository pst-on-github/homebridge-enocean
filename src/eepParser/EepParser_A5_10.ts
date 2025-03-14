import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';

/*
  * A5-10:  4BS - Room Operating Panel
  * 
  * Supported types:
  * 
  * 0B Temperature Sensor and Single Input Contact
  */
export class EepParser_A5_10 extends EepParser {

  private readonly _limitsOfType: {
    [key: number]: { tMin: number; mT: number; }
  } = {
      // A5-10-0B 0°C to +40°C and Single Input Contact
      0x0B: { tMin: 40, mT: -40 / 255 },
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

    const eep = super.parseBase(telegram);

    eep.values.isOn = eep.values.isContactClosed = (db0 & 0x01) === 0;
    eep.values.temperature = this._limits.tMin + db1 * this._limits.mT;

    return eep;
  }

  toString(values: IParsedValues): string {

    const type = Util.toHexString(this.eepType);

    let message = `${this.constructor.name}-${type}:`;

    if (values.temperature !== undefined) {
      const temp = values.temperature?.toFixed(1);
      message += ` T=${temp} °C`;
    }
 
    if (values.isContactClosed) {
      message += ' CLOSED';
    } else {
      message += ' NOT CLOSED';
    }

    return message;
  }
}
