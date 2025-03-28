import { API, Logging, PlatformAccessory, Service } from 'homebridge';
import { EnOceanHomebridgePlatform } from '../platform';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { PLATFORM_NAME } from '../settings';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';

export declare class HistoryService extends Service  {

  addEntry(entry: unknown): void;

  getInitialTime(): number;

}

export class HistoryServiceFactory {

  /**
   * Assemble a unique name for the history data
   * @param config The device config is used to assemble a unique name
   */
  private static getFilename(config: DeviceConfig): string {
    const filename = `${PLATFORM_NAME}.EnOID_${config.devId.toString().replace(/:/g, '-')}.history.json`;
    return filename;
  }

  /**
   * Gets the option parameter for the fakegato history service
   * @param config The device configuration to use
   * @returns The optional parameter
   */
  private static getOptionalParams(api: API, config: DeviceConfig, log: Logging) {
    const debug = process.env.DEBUG;
    const isFakegatoDebug = debug && debug.toLocaleLowerCase().includes('homebridge-enocean-fakegato');
    log.info(`${config.name}: fakegato debug log is ${isFakegatoDebug?'on': 'off'}`);

    return {
      storage: 'fs',
      path: api.user.persistPath(),
      filename: this.getFilename(config),
      log: isFakegatoDebug ? log : undefined,
    };
  }

  /**
   * Creates the fakegato history service
   * @param platform 
   * @param accessory 
   * @param config 
   * @returns the service if configured or undefined
   */
  static getOptionalHistoryService(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
    service: string = 'custom',
  ): HistoryService | undefined {

    if (platform.FakeGatoHistoryService) {
      const optionalParams = this.getOptionalParams(platform.api, config, platform.log);
      const historyService = new platform.FakeGatoHistoryService(service, accessory, optionalParams);
      return historyService;
    }

    return undefined;
  }
}
