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
export class ContactSensorAccessory extends EnoAccessory implements IEnoAccessory {

  private _gateway: EnoGateway | undefined;
  private _statusActiveWrapper?: StatusActiveWrapper;

  private _service: Service;
  private _batteryService?: BatteryServiceHelper;
  private _state: number;

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

    if (accessory.context.contactSensorState === undefined) {
      accessory.context.contactSensorState
        = this.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }

    this._state = accessory.context.contactSensorState;

    if (/^A5-14/.test(config.eep)) {
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

    // Get the TemperatureSensor service if it exists, otherwise create a new TemperatureSensor service
    // you can create multiple services for each accessory
    this._service = this.accessory.getService(this.hap.Service.ContactSensor)
      || this.accessory.addService(this.hap.Service.ContactSensor);
    this._service.setCharacteristic(this.hap.Characteristic.Name, accessory.displayName);

    // Each service must implement at-minimum the "required characteristics" for the given service type  
    // see https://developers.homebridge.io/#/service/ContactSensor
    this._service.getCharacteristic(this.hap.Characteristic.ContactSensorState)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._state));

    if (this._statusActiveWrapper !== undefined) {
      this._service.getCharacteristic(this.hap.Characteristic.StatusActive)
        .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._statusActiveWrapper!.statusActive));
    }

    if (config.time && config.time > 10) {
      this._statusTamperedTimeout = config.time;
      this._statusTampered = this.hap.Characteristic.StatusTampered.NOT_TAMPERED;

      this._service.getCharacteristic(this.hap.Characteristic.StatusTampered)
        .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._statusTampered));
    }

    if (/^A5-14/.test(config.eep)) {
      const isChargeable = false;
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
    const previousState = this._state;

    const CONTACT_DETECTED = this.hap.Characteristic.ContactSensorState.CONTACT_DETECTED;
    const CONTACT_NOT_DETECTED = this.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;

    let state = undefined;

    state = (message.values.isContactClosed) ? CONTACT_DETECTED : CONTACT_NOT_DETECTED;

    this._batteryService?.updateCharacteristics(message);

    if (state !== undefined) {

      this._state = state;
      this.accessory.context.contactSensorState = this._state;

      this._service.updateCharacteristic(this.hap.Characteristic.ContactSensorState, this._state);
      this._historyService?.addEntry({ time: Math.round(new Date().valueOf() / 1000), contact: this._state });
    }

    this._statusActiveWrapper?.update();

    if (this._statusTamperedTimeout) {

      if (previousState !== this._state || !this._statusTamperedTimeoutId) {
        if (this._state === CONTACT_NOT_DETECTED) {

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
