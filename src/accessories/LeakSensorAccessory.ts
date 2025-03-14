import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { EnOceanHomebridgePlatform } from '../platform';

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
 */
export class LeakSensorAccessory extends EnoAccessory implements IEnoAccessory {

  private _gateway: EnoGateway | undefined;
  private _statusActiveWrapper?: StatusActiveWrapper;

  private _service: Service;
  private _temperatureSensorService?: Service;
  private _batteryService?: BatteryServiceHelper;
  
  private _isLeakDetected: number;

  private _currentTemperature: number | undefined;

  private _statusTampered?: number;
  private _statusTamperedTimeout?: number;
  private _statusTamperedTimeoutId?: NodeJS.Timeout;

  private _historyService: HistoryService | undefined = undefined;

  constructor(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
  ) {
    super(platform, accessory, config);

    if (accessory.context.leakDetected === undefined) {
      accessory.context.leakDetected
        = this.hap.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    }

    this._isLeakDetected = accessory.context.leakDetected;
    this._currentTemperature = accessory.context.currentTemperature;

    if (/^A5-(10|14)/.test(config.eep)) {
      this._statusActiveWrapper = new StatusActiveWrapper(platform.log, accessory.displayName);
      this._statusActiveWrapper.statusActiveChanged = (statusActive: boolean) => {
        this._service.updateCharacteristic(this.hap.Characteristic.StatusActive, statusActive);
      };
    }

    // Get the historyService if available in the platform
    this._historyService = HistoryServiceFactory
      .getOptionalHistoryService(platform, accessory, config);

    // Set accessory information service
    InformationServiceHelper.setupService(platform, accessory, config);

    // Get the LeakSensor service if it exists, otherwise create a new LeakSensor service
    this._service = this.accessory.getService(this.hap.Service.LeakSensor)
      || this.accessory.addService(this.hap.Service.LeakSensor);
    this._service.setCharacteristic(this.hap.Characteristic.Name, accessory.displayName);

    // Each service must implement at-minimum the "required characteristics" for the given service type  
    // see https://developers.homebridge.io/#/service/LeakSensor
    this._service.getCharacteristic(this.hap.Characteristic.LeakDetected)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._isLeakDetected));
    
    if (/^A5-10/.test(config.eep)) {
      this._temperatureSensorService = this.accessory.getService(this.hap.Service.TemperatureSensor)
        || this.accessory.addService(this.hap.Service.TemperatureSensor);
      
      this._temperatureSensorService.getCharacteristic(this.hap.Characteristic.CurrentTemperature)
        .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._currentTemperature));
    }

    if (this._statusActiveWrapper !== undefined) {
      this._service.getCharacteristic(this.hap.Characteristic.StatusActive)
        .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._statusActiveWrapper!.statusActive));
    }

    if (/^A5-14/.test(config.eep)) {
      const isChargeable = false;
      this._batteryService = new BatteryServiceHelper(platform, accessory, isChargeable);
      this._batteryService = new BatteryServiceHelper(platform, accessory, isChargeable);
    }
  }

  async setGateway(gateway: EnoGateway): Promise<void> {
    this._gateway = gateway;
    // Register message receiver in the gateway
    await this._gateway.registerEnoAccessory(this.config, this.EnoGateway_eepMessageReceived.bind(this));
  }

  private EnoGateway_eepMessageReceived(message: ParsedMessage): void {
    this.platform.log.debug(`${this.accessory.displayName}: ${message.toString()}`);
    const previousState = this._isLeakDetected;

    const LEAK_DETECTED = this.hap.Characteristic.LeakDetected.LEAK_DETECTED;
    const LEAK_NOT_DETECTED = this.hap.Characteristic.LeakDetected.LEAK_NOT_DETECTED;

    let state = undefined;

    state = (message.values.isContactClosed) ? LEAK_DETECTED : LEAK_NOT_DETECTED;

    if (state !== undefined) {
      
      this._isLeakDetected = state;
      this.accessory.context.contactSensorState = this._isLeakDetected;
      
      this._service.updateCharacteristic(this.hap.Characteristic.LeakDetected, this._isLeakDetected);
      this._historyService?.addEntry({ time: Math.round(new Date().valueOf() / 1000), contact: this._isLeakDetected });
    }

    if (message.values.temperature !== undefined) {
      this._currentTemperature = message.values.temperature;
      this._temperatureSensorService?.updateCharacteristic(this.hap.Characteristic.CurrentTemperature, this._currentTemperature);
      this._historyService?.addEntry({ time: Math.round(new Date().valueOf() / 1000), temp: this._currentTemperature });
      this.accessory.context.currentTemperature = this._currentTemperature;
    }

    this._batteryService?.updateCharacteristics(message);
    this._statusActiveWrapper?.update();

    if (this._statusTamperedTimeout) {

      if (previousState !== this._isLeakDetected || !this._statusTamperedTimeoutId) {
        if (this._isLeakDetected === LEAK_NOT_DETECTED) {

          this._statusTamperedTimeoutId = setTimeout(() => {
            this._statusTampered = this.hap.Characteristic.StatusTampered.TAMPERED;
            this._service.updateCharacteristic(this.hap.Characteristic.StatusTampered, this._statusTampered);
          }, this._statusTamperedTimeout * 1000);

        } else {

          if (this._statusTamperedTimeoutId) {
            clearTimeout(this._statusTamperedTimeoutId);
          }
          this._statusTampered = this.hap.Characteristic.StatusTampered.NOT_TAMPERED;
          this._service.updateCharacteristic(this.hap.Characteristic.StatusTampered, this._statusTampered);
        }
      }
    }
  }
}
