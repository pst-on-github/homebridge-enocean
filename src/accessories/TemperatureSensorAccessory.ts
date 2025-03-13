import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { EnOceanHomebridgePlatform } from '../platform';

import * as EnoCore from 'enocean-core';

import { IEnoAccessory } from './IEnoAccessory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { EnoGateway } from '../enocean/EnoGateway';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';
import { BatteryServiceHelper } from '../serviceHelper/BatteryServiceHelper';
import { InformationServiceHelper } from '../serviceHelper/InformationServiceHelper';
import { HistoryServiceFactory, HistoryService } from '../serviceHelper/HistoryServiceFactory';
import { EnoAccessory } from './EnoAccessory';
import { StatusActiveWrapper } from '../serviceHelper/StatusActiveWrapper';
import { ParsedMessage } from '../eepParser/ParsedMessage';

/**
 * EnoTemperatureSensorAccessory
 * An instance of this class is created for each temperature sensor
 * Creates a relative humidity service as well depending on EEP
 */
export class TemperatureSensorAccessory extends EnoAccessory implements IEnoAccessory {

  private _gateway: EnoGateway | undefined;
  private _statusActiveWrapper: StatusActiveWrapper;

  private _service: Service;
  private _batteryService: BatteryServiceHelper | undefined;
  private _relativeHumidityService: Service | undefined;

  private _currentTemperature: number | undefined;
  private _currentRelativeHumidity: number | undefined;

  private _historyService: HistoryService | undefined = undefined;

  constructor(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
  ) {
    super(platform, accessory, config);

    this._currentTemperature = accessory.context.currentTemperature;
    this._currentRelativeHumidity = accessory.context.currentRelativeHumidity;

    this._statusActiveWrapper = new StatusActiveWrapper(platform.log, accessory.displayName);
    this._statusActiveWrapper.statusActiveChanged = (statusActive: boolean) => {
      this._service.updateCharacteristic(this.hap.Characteristic.StatusActive, statusActive);
    };

    // Get the historyService if available in the platform
    this._historyService = HistoryServiceFactory
      .getOptionalHistoryService(platform, accessory, config);

    // Set accessory information service
    InformationServiceHelper.setupService(platform, accessory, config);

    // Get the TemperatureSensor service if it exists, otherwise create a new TemperatureSensor service
    // you can create multiple services for each accessory
    this._service = this.accessory.getService(this.hap.Service.TemperatureSensor)
      || this.accessory.addService(this.hap.Service.TemperatureSensor);
    this._service
      .setCharacteristic(this.hap.Characteristic.Name, accessory.displayName);

    // Each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/TemperatureSensor

    // Register handlers for the Characteristics
    this._service.getCharacteristic(this.hap.Characteristic.StatusActive)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._statusActiveWrapper.statusActive));
    this._service.getCharacteristic(this.hap.Characteristic.CurrentTemperature)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._currentTemperature));


    if (config.manufacturerId === EnoCore.Manufacturers.ELTAKO) {
      this._batteryService = new BatteryServiceHelper(platform, accessory);
    }

    if (/^A5-04/i.test(config.eepId.toString())) { // This has a humidity sensor
      // Get the HumiditySensor service if it exists, otherwise create a new HumiditySensor service
      this._relativeHumidityService = this.accessory.getService(this.hap.Service.HumiditySensor)
        || this.accessory.addService(this.hap.Service.HumiditySensor);
      this._relativeHumidityService.setCharacteristic(this.hap.Characteristic.Name, accessory.displayName);

      this._relativeHumidityService.getCharacteristic(this.hap.Characteristic.CurrentRelativeHumidity)
        .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._currentRelativeHumidity));
    }
  }

  async setGateway(gateway: EnoGateway): Promise<void> {
    this._gateway = gateway;
    // Register message receiver in the gateway
    await this._gateway.registerEnoAccessory(this.config, this.EnoGateway_eepMessageReceived.bind(this));
  }

  private EnoGateway_eepMessageReceived(message: ParsedMessage): void {

    this.platform.log.debug(`${this.accessory.displayName}: ${message.toString()}`);

    if (message.values.temperature !== undefined) {
      this._currentTemperature = message.values.temperature;
      this._service.updateCharacteristic(this.hap.Characteristic.CurrentTemperature, this._currentTemperature);
      this._historyService?.addEntry({ time: Math.round(new Date().valueOf() / 1000), temp: this._currentTemperature });
      this.accessory.context.currentTemperature = this._currentTemperature;
    }

    if (this._relativeHumidityService !== undefined) {
      if (message.values.relativeHumidity !== undefined) {
        this._currentRelativeHumidity = message.values.relativeHumidity;
        this._relativeHumidityService
          .updateCharacteristic(this.hap.Characteristic.CurrentRelativeHumidity, this._currentRelativeHumidity);
        this._historyService
          ?.addEntry({ time: Math.round(new Date().valueOf() / 1000), humidity: this._currentRelativeHumidity });
        this.accessory.context.currentRelativeHumidity = this._currentRelativeHumidity;
      }
    }

    this._batteryService?.updateCharacteristics(message);
    this._statusActiveWrapper.update();
  }
}
