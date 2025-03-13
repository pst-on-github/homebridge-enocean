import type { EnOceanHomebridgePlatform } from '../platform';

import { CharacteristicValue, HAP, PlatformAccessory, Service } from 'homebridge';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';
import { ParsedMessage } from '../eepParser/ParsedMessage';


export interface IEnoBatteryMessage {
  get isBatteryLow(): boolean | undefined;
  get batteryLevel(): number | undefined
};

/**
 * The `EnoBatteryService` class is responsible for managing the battery service
 * of an EnOcean accessory within the Homebridge platform. It handles the battery
 * status, battery level, and charging state characteristics, updating them based
 * on incoming messages.
 *
 * @class EnoBatteryService
 */
export class BatteryServiceHelper {

  private _statusLowBattery: number = 0;
  private _batteryLevel: number = 100;
  private _previousBatteryLevel: number | undefined;
  private _chargingState: number;
  
  readonly service: Service;
  private _hap: HAP;

  /**
   * Constructs an instance of the BatteryService.
   * 
   * @param platform - The EnOceanHomebridgePlatform instance.
   * @param accessory - The PlatformAccessory instance with IEnoAccessoryContext.
   * 
   * This constructor initializes the BatteryService by either retrieving an existing
   * Battery service from the accessory or adding a new one. It also sets up handlers
   * for the StatusLowBattery, BatteryLevel, and ChargingState characteristics to 
   * retrieve their respective properties.
   */
  constructor(
    private readonly platform: EnOceanHomebridgePlatform,
    private readonly accessory: PlatformAccessory<EnoAccessoryContext>,
    private readonly isChargeable: boolean = true,
  ) {

    this._hap = platform.api.hap;

    this._chargingState = isChargeable
      ? this._hap.Characteristic.ChargingState.NOT_CHARGING
      : this._hap.Characteristic.ChargingState.NOT_CHARGEABLE;

    // See https://developers.homebridge.io/#/service/Battery
    this.service = this.accessory.getService(this._hap.Service.Battery)
      || this.accessory.addService(this._hap.Service.Battery);
    
    this.service.getCharacteristic(this._hap.Characteristic.StatusLowBattery)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._statusLowBattery));
    this.service.getCharacteristic(this._hap.Characteristic.BatteryLevel)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._batteryLevel));
    this.service.getCharacteristic(this._hap.Characteristic.ChargingState)
      .onGet(async (): Promise<CharacteristicValue> => this.getProperty(this._chargingState));
  }

  updateCharacteristics(message: ParsedMessage): void {

    if (this.service !== undefined) {
      if (message.values.isBatteryLow !== undefined) {
        this._statusLowBattery = message.values.isBatteryLow
          ? this._hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
          : this._hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        this.service.updateCharacteristic(this._hap.Characteristic.StatusLowBattery, this._statusLowBattery);
      }

      if (message.values.batteryLevel !== undefined) {
        this._batteryLevel = message.values.batteryLevel;
        this.service.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this._batteryLevel);

        if (this.isChargeable) {

          if (this._previousBatteryLevel === undefined) {

            this._previousBatteryLevel = this._batteryLevel;
            this._chargingState = this._hap.Characteristic.ChargingState.NOT_CHARGING;
            this.service.updateCharacteristic(this._hap.Characteristic.ChargingState, this._chargingState);

          } else if (Math.abs(this._previousBatteryLevel - this._batteryLevel) > 0.5) {

            const oldChargingState = this._chargingState;
            if (this._batteryLevel > this._previousBatteryLevel) {
              this._chargingState = this._hap.Characteristic.ChargingState.CHARGING;
            } else {
              this._chargingState = this._hap.Characteristic.ChargingState.NOT_CHARGING;
            }

            if (oldChargingState !== this._chargingState) {
              this.platform.log.info(`${this.accessory.displayName}: battery ${this._chargingState ? 'CHARGING' : 'NOT CHARGING'}`);
            }
            
            this._previousBatteryLevel = this._batteryLevel;
            this.service.updateCharacteristic(this._hap.Characteristic.ChargingState, this._chargingState);
          }
        }
      }
    }
  }

  private async getProperty(property: number): Promise<CharacteristicValue> {
    return property;
  }
}
