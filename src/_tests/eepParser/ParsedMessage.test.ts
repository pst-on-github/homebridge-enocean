import { ParsedMessage } from '../../eepParser/ParsedMessage';
import * as EnoCore from 'enocean-core';
import { EepParser } from '../../eepParser/EepParser';

describe('ParsedMessage', () => {
  describe('toString', () => {
    it('should return the string representation of the parsed values using the parser', () => {
      // Mock the parser
      const mockParser = {
        toString: jest.fn().mockReturnValue('Mocked String Representation'),
      } as unknown as EepParser;

      // Create a mock telegram
      const mockTelegram = {} as EnoCore.ERP1Telegram;

      // Create an instance of ParsedMessage
      const parsedMessage = new ParsedMessage(mockTelegram, mockParser);

      // Set some mock values
      parsedMessage.values.temperature = 22.5;
      parsedMessage.values.relativeHumidity = 60;

      // Call toString
      const result = parsedMessage.toString();

      // Assertions
      expect(mockParser.toString).toHaveBeenCalledWith(parsedMessage.values);
      expect(result).toBe('Mocked String Representation');
    });
  });
});