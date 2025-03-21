import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';

/**
  * A5-38:  4BS - Central Command
  * 
  * Supports:
  * 
  * 08 Gateway
  */
export class EepParser_A5_38_08 extends EepParser {

  private _stateMap: { [key: number]: boolean } = {
    0x70: true,    // state on
    0x50: false,   // state off
  };

  private _alertMap: { [key: number]: boolean } = {
    0x30: true,    // alert on
    0x10: false,   // alert off
  };

  /**
   * Initializes an instance of EepParser_A5_38_08
   * @param type the EEP type
   */
  constructor(type: number) {
    super(type);

    // Gateway type 0x08 is supported
    if (type !== 0x08) {
      throw new Error(`${Util.toHexString(type)}: EEP type not supported`);
    }
  }

  parse(telegram: EnoCore.ERP1Telegram): ParsedMessage {

    const eep = super.parseBase(telegram);

    switch (telegram.rorg) {
      case EnoCore.RORGs.RPS: {
        const db0 = telegram.getDB(0);

        eep.values.isOn = this._stateMap[db0];
        eep.values.isAlert = this._alertMap[db0];
      } break;

      case EnoCore.RORGs.FOURBS: {

        const db0 = telegram.getDB(0);
        const db1 = telegram.getDB(1);
        const db2 = telegram.getDB(2);
        const db3 = telegram.getDB(3);

        switch (db3) {
          case 2: { // Dimming command
            eep.values.isOn = (db0 & 0x01) !== 0;     // state on
            eep.values.brightness = db2;              // brightness
          } break;

          default: {
            // The 3E8 (TF61L) replies with 4BS '9E2D0708'-'00' which is the D3-D1 = <localId>
            // w/o the highest octet 'FF' and D0 = 08 = data message (no teach-in but data)
            if ((db0 & 0x08) !== 0) { // data message (no teach-in)
              eep.values.eltakoMsc = { confirmedLocalId: EnoCore.DeviceId.fromNumber((db3 << 16) + (db2 << 8) + db1) };
            }
          }
        }
      } break;
    }

    return eep;
  }

  toString(values: IParsedValues): string {
    const type = this.eepType.toString(16).padStart(2, '0').toUpperCase();

    let message = `${this.constructor.name}-${type}:`;
    if (values.isOn !== undefined) {
      message += ` state:${values.isOn}`;
    }
    if (values.brightness !== undefined) {
      message += ` brightness:${values.brightness}`;
    }
    if (values.isAlert !== undefined) {
      message += ` alert:${values.isAlert}`;
    }
    if (values.eltakoMsc !== undefined) {
      message += ` confirmedLocalId:${values.eltakoMsc.confirmedLocalId}`;
    }

    return message;
  }
}
