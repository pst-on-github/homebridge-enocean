import { EepParser } from './EepParser';
import { EepParser_A5_02 } from './EepParser_A5_02';
import { EepParser_A5_04 } from './EepParser_A5_04';
import { EepParser_A5_08 } from './EepParser_A5_08';
import { EepParser_A5_10 } from './EepParser_A5_10';
import { EepParser_A5_14 } from './EepParser_A5_14';
import { EepParser_A5_30 } from './EepParser_A5_30';
import { EepParser_A5_38_08 } from './EepParser_A5_38_08';
import { EepParser_A5_3F_7F_Eltako } from './EepParser_A5_3F_7F_Eltako';
import { EepParser_D2_05 } from './EepParser_D2_05';
import { EepParser_F6 } from './EepParser_F6';

type ParserClassType = new (type: number) => EepParser;

export class EepParserFactory {

  private classMap: Map<string, ParserClassType> = new Map<string, ParserClassType>();

  constructor() {

    this.registerClass('A5-02', EepParser_A5_02);
    this.registerClass('A5-04', EepParser_A5_04);
    this.registerClass('A5-08', EepParser_A5_08);
    this.registerClass('A5-14', EepParser_A5_14);
    this.registerClass('F6-01', EepParser_F6);
    this.registerClass('F6-02', EepParser_F6);

    this.registerClass('A5-10', EepParser_A5_10);
    this.registerClass('A5-30', EepParser_A5_30);
    this.registerClass('A5-38-08', EepParser_A5_38_08);
    this.registerClass('A5-3F-7F', EepParser_A5_3F_7F_Eltako);

    this.registerClass('D2-05', EepParser_D2_05);
  }

  /**
   * Create a new parser for the given EEP
   * @param eep the EEP to create a parser for. RORG and FUNC is required.
   * @returns A new instance of the parser for the given EEP
   */
  newParser(eep: string): EepParser {

    const classRef = this.classMap.get(eep)
      || this.classMap.get(eep.substring(0, 5));

    if (!classRef) {
      throw new Error(`${eep}: EEP not supported, cannot create parser`);
    }

    const hexType = eep.slice(-2); // Get the last two characters
    const type = parseInt(hexType, 16); // Convert hex to number

    return new classRef(type);
  }

  /**
   * Register a class for a given EnOcean ID
   * @param id the EnOcean ID to register the class for
   * @param classRef the class to register
   */
  private registerClass(id: string, classRef: ParserClassType): void {
    this.classMap.set(id, classRef);
  }

}
