import { EepParserFactory } from '../../../src/eepParser/ParserFactory';
import { EepParser_A5_02 } from '../../../src/eepParser/EepParser_A5_02';
import { EepParser_A5_04 } from '../../../src/eepParser/EepParser_A5_04';
import { EepParser_A5_08 } from '../../../src/eepParser/EepParser_A5_08';
import { EepParser_A5_14 } from '../../../src/eepParser/EepParser_A5_14';
import { EepParser_A5_30 } from '../../../src/eepParser/EepParser_A5_30';
import { EepParser_A5_38_08 } from '../../../src/eepParser/EepParser_A5_38_08';
import { EepParser_A5_3F_7F_Eltako } from '../../../src/eepParser/EepParser_A5_3F_7F_Eltako';
import { EepParser_D2_05 } from '../../../src/eepParser/EepParser_D2_05';
import { EepParser_F6 } from '../../../src/eepParser/EepParser_F6';

describe('EepParserFactory', () => {
  let factory: EepParserFactory;

  beforeEach(() => {
    factory = new EepParserFactory();
  });

  it('should create a parser for A5-02', () => {
    const parser = factory.newParser('A5-02-01');
    expect(parser).toBeInstanceOf(EepParser_A5_02);
  });

  it('should create a parser for A5-04', () => {
    const parser = factory.newParser('A5-04-01');
    expect(parser).toBeInstanceOf(EepParser_A5_04);
  });

  it('should create a parser for A5-08', () => {
    const parser = factory.newParser('A5-08-01');
    expect(parser).toBeInstanceOf(EepParser_A5_08);
  });

  it('should create a parser for A5-14', () => {
    const parser = factory.newParser('A5-14-09');
    expect(parser).toBeInstanceOf(EepParser_A5_14);
  });

  it('should create a parser for F6-01', () => {
    const parser = factory.newParser('F6-01-01');
    expect(parser).toBeInstanceOf(EepParser_F6);
  });

  it('should create a parser for F6-02', () => {
    const parser = factory.newParser('F6-02-01');
    expect(parser).toBeInstanceOf(EepParser_F6);
  });

  it('should create a parser for A5-30', () => {
    const parser = factory.newParser('A5-30-01');
    expect(parser).toBeInstanceOf(EepParser_A5_30);
  });

  it('should create a parser for A5-38-08', () => {
    const parser = factory.newParser('A5-38-08');
    expect(parser).toBeInstanceOf(EepParser_A5_38_08);
  });

  it('should create a parser for A5-3F-7F', () => {
    const parser = factory.newParser('A5-3F-7F');
    expect(parser).toBeInstanceOf(EepParser_A5_3F_7F_Eltako);
  });

  it('should create a parser for D2-05', () => {
    const parser = factory.newParser('D2-05-00');
    expect(parser).toBeInstanceOf(EepParser_D2_05);
  });

  it('should throw an error for unsupported EEP', () => {
    expect(() => factory.newParser('A5-99-01')).toThrow('A5-99-01: EEP not supported, cannot create parser');
  });
});