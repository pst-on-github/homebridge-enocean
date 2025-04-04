import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { EnOceanHomebridgePlatform } from '../platform';

import * as EnoCore from 'enocean-core';

import { IEnoAccessory } from './IEnoAccessory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { EnoMessageFactory } from '../enocean/EnoMessageFactory';
import { EnoGateway } from '../enocean/EnoGateway';
import { InformationServiceHelper } from '../serviceHelper/InformationServiceHelper';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';
import { EnoAccessory } from './EnoAccessory';
import { ParsedMessage } from '../eepParser/ParsedMessage';

/**
 * EnoTemperatureSensorAccessory
 * An instance of this class is created for each temperature sensor
 * Creates a relative humidity service as well depending on EEP
 */
export class OutletAccessory extends EnoAccessory implements IEnoAccessory {

  private _gateway: EnoGateway | undefined;
  private _senderId: EnoCore.DeviceId | undefined;
  private _service: Service;

  private _stateOn: boolean;

  constructor(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
  ) {
    super(platform, accessory, config);

    if (accessory.context.on === undefined) {
      accessory.context.on = false;
    }
    
    this._stateOn = accessory.context.on;

    // Set accessory information service
    InformationServiceHelper.setupService(platform, accessory, config);

    // Get the TemperatureSensor service if it exists, otherwise create a new TemperatureSensor service
    // you can create multiple services for each accessory
    this._service = this.accessory.getService(this.hap.Service.Outlet)
      || this.accessory.addService(this.hap.Service.Outlet, config.name);
    this._service
      .setCharacteristic(this.hap.Characteristic.Name, accessory.displayName);

    this.accessory.displayName = config.name;

    // Each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Outlet

    // Register handlers for the Characteristics
    this._service.getCharacteristic(this.hap.Characteristic.On)
      .onGet(async (): Promise<CharacteristicValue> => {
        return this._stateOn;
      });
    this._service.getCharacteristic(this.hap.Characteristic.On).onSet(this.On_OnSet.bind(this));
  }

  async setGateway(gateway: EnoGateway): Promise<void> {
    this._gateway = gateway;

    // Allocate new or persisted sender ID
    this.accessory.context.localSenderIndex = gateway
      .claimSenderIndex(this.accessory.context.localSenderIndex);

    if (this.accessory.context.localSenderIndex !== undefined) {
      this._senderId = gateway.getSenderId(this.accessory.context.localSenderIndex);
    } else {
      this.platform.log.warn('Failed to claim individual sender id. The limit of 128 might be exceeded.');
    }

    // Register message receiver and senderId in the gateway
    return this._gateway.registerEnoAccessory(this.config, this.EnoGateway_eepMessageReceived.bind(this), this._senderId);
  }

  private async On_OnSet(value: CharacteristicValue): Promise<void> {
    this.platform.log.info(`${this.accessory.displayName}: SET on ${value}`);

    this._stateOn = value as boolean;
    this.accessory.context.on = this._stateOn;

    if (this._gateway && this._senderId) {
      let erp1 = undefined;

      if (this.config.eepId.rorg === EnoCore.RORGs.FOURBS) {

        if (this._gateway.isTeachInMode()) {
          erp1 = EnoMessageFactory.newFourBSTeachInMessage(
            this._senderId, this.config.eepId, this.config.manufacturerId);
        } else {
          erp1 = EnoMessageFactory.newFourBSGatewaySwitchingMessage(this._stateOn);
        }
      } else if (this.config.eepId.rorg === EnoCore.RORGs.RPS) {
        erp1 = EnoMessageFactory.newRpsOnMessage(this._senderId, this._stateOn);
      }

      if (erp1 !== undefined) {
        erp1.sender = this._senderId;
        erp1.destination = this.config.devId;
        await this._gateway.sendERP1TelegramCore(erp1);
      }
    }
  }

  private EnoGateway_eepMessageReceived(message: ParsedMessage): void {

    this.platform.log.debug(`${this.accessory.displayName}: ${message.toString()}`);

    if (message.values.isOn !== undefined) {
      this._stateOn = (message.values.isOn ?? false) || (message.values.buttons?.includes('B0') ?? false);
      this.accessory.context.on = this._stateOn;
      this.platform.log.info(`${this.accessory.displayName}: UPDATE on ${this._stateOn}`);
      this._service.updateCharacteristic(this.hap.Characteristic.On, this._stateOn);
    }
  }
}
