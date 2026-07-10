export enum ParameterCode {
  OUT_AG_5 = '5',
  OUT_AG_8 = '8',
  OUT_AG_11 = '11',
  OUT_AG_14 = '14',
  OUT_AG_17 = '17',
  OUT_AG_20 = '20',
  OUT_AG_23 = '23',
  OUT_AG_26 = '26',
  OUT_AG_29 = '29',
  OUT_AG_41 = '41',
  OUT_AG_44 = '44',
  OUT_AG_47 = '47',
  OUT_AG_71 = 'PH',

  IN_AG_110 = '110',
  IN_AG_116 = '116',
  IN_AG_119 = '119',
  IN_AG_122 = '122',
  IN_AG_128 = '128',
  IN_AG_104 = '104',
  IN_AG_107 = '107',
  IN_AG_114 = '114',
  IN_AG_125 = '125',
}

export const ParameterNames: Record<ParameterCode, string> = {
  [ParameterCode.OUT_AG_5]: 'co',
  [ParameterCode.OUT_AG_8]: 'so2',
  [ParameterCode.OUT_AG_11]: 'h2s',
  [ParameterCode.OUT_AG_14]: 'no2',
  [ParameterCode.OUT_AG_17]: 'o3',
  [ParameterCode.OUT_AG_20]: 'temp',
  [ParameterCode.OUT_AG_23]: 'humidity',
  [ParameterCode.OUT_AG_26]: 'abs_humidity',
  [ParameterCode.OUT_AG_29]: 'dew_point',
  [ParameterCode.OUT_AG_41]: 'pm1',
  [ParameterCode.OUT_AG_44]: 'pm2.5',
  [ParameterCode.OUT_AG_47]: 'pm10',
  [ParameterCode.OUT_AG_71]: 'noise',

  [ParameterCode.IN_AG_110]: 'co',
  [ParameterCode.IN_AG_116]: 'no2',
  [ParameterCode.IN_AG_119]: 'temp',
  [ParameterCode.IN_AG_122]: 'humidity',
  [ParameterCode.IN_AG_128]: 'noise',
  [ParameterCode.IN_AG_104]: 'co2',
  [ParameterCode.IN_AG_107]: 'voc',
  [ParameterCode.IN_AG_114]: 'ch4',
  [ParameterCode.IN_AG_125]: 'pressure',
};

export function getParameterName(code: ParameterCode): string {
  return ParameterNames[code];
}

/** A resolved CSV column: the parameter code as found in config and its human-readable name. */
export interface ResolvedParameterColumn {
  /** Parameter code as provided in config.parameterTypes (e.g. "44"). */
  code: string;
  /** Human-readable name from parameters.ts (e.g. "pm2.5"). */
  name: string;
}

/**
 * Resolve a single parameter code (as found in config.parameterTypes) to its human-readable name.
 *
 * @param code Parameter code, e.g. "44"
 * @returns Human-readable name, e.g. "pm2.5"
 * @throws Error if the code has no matching entry in parameters.ts
 */
export function resolveParameterName(code: string): string {
  const name = (ParameterNames as Record<string, string>)[code];
  if (name === undefined) {
    throw new Error(
      `Unknown parameter type "${code}": no matching key found in src/config/parameters.ts. ` +
      `Add it to ParameterCode/ParameterNames or remove it from parameterTypes.`
    );
  }
  return name;
}

/**
 * Build ordered CSV column definitions from the requested parameter types.
 * Validates every code up-front and fails fast, listing ALL unknown codes, if any are missing.
 * Column order matches the order of parameterTypes in the configuration.
 *
 * @param parameterTypes Parameter codes from config.parameterTypes
 * @returns Ordered resolved columns (code + name)
 * @throws Error naming every unknown parameter code
 */
export function resolveParameterColumns(parameterTypes: string[]): ResolvedParameterColumn[] {
  const columns: ResolvedParameterColumn[] = [];
  const missing: string[] = [];

  for (const code of parameterTypes) {
    const name = (ParameterNames as Record<string, string>)[code];
    if (name === undefined) {
      missing.push(code);
    } else {
      columns.push({ code, name });
    }
  }

  if (missing.length > 0) {
    const missingList = missing.map((c) => `"${c}"`).join(', ');
    throw new Error(
      `Unknown parameter type(s) with no matching key in src/config/parameters.ts: ${missingList}. ` +
      `Add them to ParameterCode/ParameterNames or remove them from parameterTypes before exporting.`
    );
  }

  return columns;
}
