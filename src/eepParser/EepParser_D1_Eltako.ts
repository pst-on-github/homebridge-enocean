import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import { IParsedValues, ParsedMessage } from './ParsedMessage';
import { Util } from '../util';
import { DeviceConfig } from '../homebridge/DeviceConfig';

export interface IMscMessage {
  manufacturerId: number;
  manufacturer: string;
  data: string;
  config?: DeviceConfig;
}

export interface IEltakoMscMessage {
  teachInStatus?: string; // 'start', 'stop', 'pass', 'fail' -- one of the teach-in states
  confirmedLocalId?: EnoCore.DeviceId;  
}

/*
  * D1:  Manufacturer Specific Communication
  * RORG D1 MSC Telegram
  */
export class EepParser_D1_Eltako extends EepParser {

  private _eltakoMessageCmdMap: { [key: string]: string } = {
    '030301': 'start',      // 'teach-in start',
    '030302': 'start',      // 'teach-in start',
    '030300': 'stop',       // 'teach-in end',
    '030400': 'pass',       // 'teach-in ID learned',
    'FC0100': 'fail',       // 'teach-in ID failed/rejected',
  };

  // See https://github.com/Jey-Cee/ioBroker.enocean/blob/master/lib/definitions/eltako.js
  // and https://github.com/Jey-Cee/ioBroker.enocean/blob/7a623c622a67ec6f723822940570dc0b36883ab2/lib/tools/Packet_handler.js#L1259

  private _eltakoDeviceMap: { [key: string]: { model: string, eep: string } } = {

    // The 3E8 (TF61L) replies with 4BS '9E2D0708'-'00' which is the D3-D1 = <localId>
    // w/o the highest octet 'FF' and D0 = 08 = data message (no teach-in but data)

    '000003E8': { model: 'TF61L-230V', eep: 'A5-38-08' },   // Light (gateway)
    '00000402': { model: 'TF61J-230V', eep: 'A5-3F-7F' },   // Blinds
    '00000414': { model: 'TF100L', eep: 'A5-38-08' },       // Socket/Light (gateway)
    '00000429': { model: 'FLD61', eep: 'A5-3F-7F' },        // LED PWM DIM
    '0000046F': { model: 'FJ62NP-230V', eep: 'A5-3F-7F' },  // Blinds
  };

  /**
   * Initializes an instance of EepParser_D1
   * @param type the EEP type
   */
  constructor(type: number = 0) {
    super(type);
  }

  parse(telegram: EnoCore.ERP1Telegram): ParsedMessage {

    const eep = super.parseBase(telegram);

    if (telegram.rorg !== EnoCore.RORGs.MSC) {
      return eep;
    }

    eep.values.msc = {} as IMscMessage;

    const data = telegram.userData.toString('hex').toUpperCase();
    const manufacturerId = parseInt(data.substring(0, 3), 16);

    if (manufacturerId === EnoCore.Manufacturers.ELTAKO) {

      switch (data.substring(4, 6)) {
        case 'FE': {
          const msg = data.substring(6, 12).toUpperCase();
          eep.values.eltakoMsc = { teachInStatus: this._eltakoMessageCmdMap[msg] };
        } break;

        case 'FF': {
          const msg = data.substring(6, 14).toUpperCase();
          const dev = this._eltakoDeviceMap[msg];

          if (dev !== undefined) {
            eep.values.msc.config = new DeviceConfig(
              telegram.sender.toString(),
              dev.eep,
              undefined,
              EnoCore.Manufacturers[manufacturerId],
              dev.model);

            // Create a temporary name for the device
            eep.values.msc.config.name = `${dev.model} ${Util.getTimeAsFourDigitString()}`;
          }
        } break;
      }
    }

    eep.values.msc.data = data;
    eep.values.msc.manufacturerId = manufacturerId;
    eep.values.msc.manufacturer = EnoCore.Manufacturers[manufacturerId];

    return eep;
  }

  toString(data: IParsedValues): string {

    let message = 'MSC';
    
    if (data !== undefined) {

      if (data.msc?.manufacturer) {
        message += ` (${data.msc?.manufacturer})`;
      }

      if (data.eltakoMsc?.teachInStatus) {
        message += ` teach-in ${data.eltakoMsc.teachInStatus}`;
      }

      if (data.msc?.config) {
        message += ` ${JSON.stringify(data.msc.config)}`;
      }
    }

    return message;
  }
}
