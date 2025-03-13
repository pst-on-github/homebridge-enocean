import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { EnOceanHomebridgePlatform } from '../platform';

import { IEnoAccessory } from './IEnoAccessory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { EnoGateway } from '../enocean/EnoGateway';
import { BatteryServiceHelper } from '../serviceHelper/BatteryServiceHelper';
import { HistoryServiceFactory } from '../serviceHelper/HistoryServiceFactory';
import { InformationServiceHelper } from '../serviceHelper/InformationServiceHelper';
import { EnoAccessory } from './EnoAccessory';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';
import { StatusActiveWrapper } from '../serviceHelper/StatusActiveWrapper';
import { ParsedMessage } from '../eepParser/ParsedMessage';

/**
 * EnoTemperatureSensorAccessory
 * An instance of this class is created for each temperature sensor
 * Creates a relative humidity service as well depending on EEP
 */
export class MotionSensorAccessory extends EnoAccessory implements IEnoAccessory {

  private _gateway: EnoGateway | undefined;

  private _service: Service;
  private _batteryService: BatteryServiceHelper | undefined;
  private _lightSensorService: Service | undefined;
  private readonly _statusActiveWrapper: StatusActiveWrapper;

  private _currentAmbientLightLevel: number = 0.0001;
  private _isMotionDetected: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private historyService: any = undefined;

  constructor(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
  ) {
    super(platform, accessory, config);

    this._statusActiveWrapper = new StatusActiveWrapper(platform.log, accessory.displayName);
    this._statusActiveWrapper.statusActiveChanged = (statusActive: boolean) => {
      this._service.updateCharacteristic(this.hap.Characteristic.StatusActive, statusActive);
      if (statusActive === false) {
        this._isMotionDetected = 0;
        this._service.updateCharacteristic(this.hap.Characteristic.MotionDetected, this._isMotionDetected);
      }
    };

    if (accessory.context.motionDetected === undefined) {
      accessory.context.motionDetected = 0;
    }

    this._isMotionDetected = accessory.context.motionDetected;

    // Get the historyService if available in the platform
    this.historyService = HistoryServiceFactory.getOptionalHistoryService(platform, accessory, config);

    // Set accessory information service
    InformationServiceHelper.setupService(platform, accessory, config);

    // Get the service if it exists, otherwise create a new service
    this._service = this.accessory.getService(this.hap.Service.MotionSensor)
      || this.accessory.addService(this.hap.Service.MotionSensor);
    this._service.setCharacteristic(this.hap.Characteristic.Name, accessory.displayName);

    // Each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/MotionSensor

    // Register handlers for the Characteristics
    this._service.getCharacteristic(this.hap.Characteristic.StatusActive)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._statusActiveWrapper.statusActive));

    const ct = this._service.getCharacteristic(this.hap.Characteristic.MotionDetected);
    ct.onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._isMotionDetected));
    // TODO ct.setProps({ minValue: 18, maxValue: 30, minStep: 1 });

    this._batteryService = new BatteryServiceHelper(platform, accessory);

    // See https://developers.homebridge.io/#/service/LightSensor
    this._lightSensorService = this.accessory.getService(this.hap.Service.LightSensor)
      || this.accessory.addService(this.hap.Service.LightSensor);
    this._lightSensorService.setCharacteristic(this.hap.Characteristic.Name, accessory.displayName);

    this._lightSensorService.getCharacteristic(this.hap.Characteristic.CurrentAmbientLightLevel)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._currentAmbientLightLevel));
  }

  async setGateway(gateway: EnoGateway): Promise<void> {
    this._gateway = gateway;
    // Register message receiver in the gateway
    await this._gateway.registerEnoAccessory(this.config, this.EnoGateway_eepMessageReceived.bind(this));
  }

  private EnoGateway_eepMessageReceived(message: ParsedMessage): void {
    this.platform.log.debug(`${this.accessory.displayName}: ${message.toString()}`);

    this._statusActiveWrapper.update();

    if (message.values.isMotionDetected !== undefined) {
      this._isMotionDetected = message.values.isMotionDetected ? 1 : 0;
      this._service.updateCharacteristic(this.hap.Characteristic.MotionDetected, this._isMotionDetected);
      this.historyService?.addEntry({ time: Math.round(new Date().valueOf() / 1000), motion: this._isMotionDetected });
    }

    if (this._lightSensorService !== undefined && message.values.ambientLightLevel !== undefined) {
      this._currentAmbientLightLevel = Math.max(0.0001, message.values.ambientLightLevel);
      this._lightSensorService.updateCharacteristic(this.hap.Characteristic.CurrentAmbientLightLevel, this._currentAmbientLightLevel);
      this.historyService?.addEntry({ time: Math.round(new Date().valueOf() / 1000), lux: this._currentAmbientLightLevel });
    }

    this._batteryService?.updateCharacteristics(message);
  }
}
