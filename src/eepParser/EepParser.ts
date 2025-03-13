import * as EnoCore from 'enocean-core';
import assert from 'assert';
import { IParsedValues, ParsedMessage } from './ParsedMessage';

export abstract class EepParser {

  constructor(
    readonly eepType: number,
  ) {
  }

  /**
   * The manufacturer ID. This is relevant for parsing the message
   * since some manufacturers support custom functions. E.g. Eltako.
   * User number type due to enum comparison in typescript.
   */
  manufacturerId: number = EnoCore.Manufacturers.Reserved;

  abstract parse(telegram: EnoCore.ERP1Telegram): ParsedMessage;

  abstract toString(data: IParsedValues): string;
  
  protected assertROrg(rorg: EnoCore.RORGs, telegram: EnoCore.ERP1Telegram) {
    assert(telegram.rorg === rorg, `${EnoCore.RORGs[telegram.rorg]}: unexpected RORG. Expected ${EnoCore.RORGs[rorg]}`);
  }

  protected parseBase(telegram: EnoCore.ERP1Telegram): ParsedMessage {
    const eepMessage = new ParsedMessage(telegram, this);
    
    return eepMessage;
  }
}
