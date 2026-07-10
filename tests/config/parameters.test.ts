import {
  resolveParameterName,
  resolveParameterColumns,
} from '../../src/config/parameters.js';

describe('parameters', () => {
  describe('resolveParameterName', () => {
    it('should map known codes to their human-readable names', () => {
      expect(resolveParameterName('44')).toBe('pm2.5');
      expect(resolveParameterName('20')).toBe('temp');
      expect(resolveParameterName('23')).toBe('humidity');
      expect(resolveParameterName('PH')).toBe('noise');
    });

    it('should throw a descriptive error for an unknown code', () => {
      expect(() => resolveParameterName('999')).toThrow(/Unknown parameter type "999"/);
    });
  });

  describe('resolveParameterColumns', () => {
    it('should resolve codes to columns preserving input order', () => {
      const columns = resolveParameterColumns(['44', '20']);
      expect(columns).toEqual([
        { code: '44', name: 'pm2.5' },
        { code: '20', name: 'temp' },
      ]);
    });

    it('should fail fast and list every unknown code', () => {
      expect(() => resolveParameterColumns(['44', '999', 'abc'])).toThrow(
        /Unknown parameter type\(s\).*"999", "abc"/
      );
    });
  });
});
