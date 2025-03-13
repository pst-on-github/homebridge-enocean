import { Util } from '../util';

describe('Util.toHex', () => {
  it('should convert number to hex with default digits', () => {
    expect(Util.toHexString(255)).toBe('FF');
    expect(Util.toHexString(10)).toBe('0A');
    expect(Util.toHexString(0)).toBe('00');
  });

  it('should convert number to hex with specified digits', () => {
    expect(Util.toHexString(255, 4)).toBe('00FF');
    expect(Util.toHexString(10, 3)).toBe('00A');
    expect(Util.toHexString(0, 5)).toBe('00000');
  });

  it('should handle large numbers', () => {
    expect(Util.toHexString(65535, 4)).toBe('FFFF');
    expect(Util.toHexString(1048575, 6)).toBe('0FFFFF');
  });

  it('should handle small numbers with more digits', () => {
    expect(Util.toHexString(1, 4)).toBe('0001');
    expect(Util.toHexString(15, 3)).toBe('00F');
  });

  describe('Util.isNullOrEmpty', () => {
    it('should return true for null', () => {
      expect(Util.isNullOrEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(Util.isNullOrEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(Util.isNullOrEmpty('')).toBe(true);
    });

    it('should return true for string with only spaces', () => {
      expect(Util.isNullOrEmpty('   ')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(Util.isNullOrEmpty('hello')).toBe(false);
    });

    it('should return false for string with spaces and characters', () => {
      expect(Util.isNullOrEmpty('  hello  ')).toBe(false);
    });
  });
});