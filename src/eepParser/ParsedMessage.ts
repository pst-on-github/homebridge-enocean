import * as EnoCore from 'enocean-core';
import { EepParser } from './EepParser';
import assert from 'assert';
import { IEltakoMscMessage } from './EepParser_D1_Eltako';
import { IMscMessage } from './EepParser_D1_Eltako';

export interface IParsedValues {
  
  ambientLightLevel?: number; // lux
  batteryLevel?: number;
  brightness?: number;        // %
  buttons?: string[];
  currentPosition?: number;
  currentSlatAngle?: number;
  eltakoMsc?: IEltakoMscMessage;
  isAlert?: boolean;
  isBatteryLow?: boolean;
  isContactClosed?: boolean;
  isMotionDetected?: boolean;
  isOccupancyDetected?: boolean;
  isOn?: boolean;
  isPressed?: boolean;
  msc?: IMscMessage;
  relativeHumidity?: number;  // %
  state?: string;
  stoppedAfter_s?: number;    // The travel time in seconds, negative if closing or undefined if not set.
  temperature?: number;       // °C
};

/**
 * This is the output of any parser and contains the parsed
 * values in the values object.
 */
export class ParsedMessage implements EnoCore.EEPMessage {

  /**
   * This contains the results from parsing the telegram
   */
  public readonly values: IParsedValues = {};

  /**
   * Initializes a new instance of the ParsedMessage class.
   * This is the output of any parser and contains the parsed
   * values in the values object.
   * 
   * @param telegram  the ERP1 telegram that was received and decoded
   * @param parser    the parser that decoded the telegram
   */
  constructor(
    public readonly telegram: EnoCore.ERP1Telegram,
    public readonly parser: EepParser,
  ) {
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fromERP1Telegram(telegram: EnoCore.ERP1Telegram): void {
    throw new Error('intentionally left blank');
  };

  /**
   * The manufacturer ID. This is relevant for parsing the message
   * since some manufacturers support custom functions. E.g. Eltako.
   * User number type due to enum comparison in typescript.
   */
  manufacturerId: number = EnoCore.Manufacturers.Reserved;

  /**
   * Gets a string from the parsed values. Using the parser that creates the values.
   */
  toString(): string {
    return this.parser.toString(this.values);
  }

  protected assertROrg(rorg: EnoCore.RORGs, telegram: EnoCore.ERP1Telegram) {
    assert(telegram.rorg === rorg, `${EnoCore.RORGs[telegram.rorg]}: unexpected RORG. Expected ${EnoCore.RORGs[rorg]}`);
  }
}
