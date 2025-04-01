import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { EnOceanHomebridgePlatform } from '../platform';

import * as EnoCore from 'enocean-core';

import { IEnoAccessory } from './IEnoAccessory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { EnoGateway } from '../enocean/EnoGateway';
import { InformationServiceHelper } from '../serviceHelper/InformationServiceHelper';
import { EnoAccessory } from './EnoAccessory';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';
import { EnoMessageFactory } from '../enocean/EnoMessageFactory';
import { ParsedMessage } from '../eepParser/ParsedMessage';

/**
 * EnoTemperatureSensorAccessory
 * An instance of this class is created for each temperature sensor
 * Creates a relative humidity service as well depending on EEP
 */
export class WindowCoveringAccessory extends EnoAccessory implements IEnoAccessory {

  private _gateway: EnoGateway | undefined;
  private _senderId: EnoCore.DeviceId | undefined;
  private _service: Service;

  private _interval: NodeJS.Timeout | undefined;
  private _positionReportTimeout: NodeJS.Timeout | undefined;
  private _travelVelocity: number;

  private _confirmedPosition: number | undefined;
  private _currentPosition: number;
  private _positionState: number;
  private _targetPosition: number;

  /**
   * Constructs a new instance of the WindowCoveringAccessory class.
   * 
   * @param platform - The EnOceanHomebridgePlatform instance.
   * @param accessory - The PlatformAccessory instance with EnoAccessoryContext.
   * @param config - The DeviceConfig instance.
   * 
   * Initializes the accessory context and sets up the initial position, target position, 
   * position state, and travel velocity. Configures the accessory information service 
   * and registers handlers for the required characteristics of the WindowCovering service.
   */
  constructor(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
  ) {
    super(platform, accessory, config);
    const hap = platform.api.hap;

    if (accessory.context.currentPosition === undefined) {
      accessory.context.currentPosition = 100;
    }

    this._currentPosition =
      this._targetPosition = accessory.context.currentPosition;

    this._positionState = hap.Characteristic.PositionState.STOPPED;
    this._travelVelocity = 100 / (this.config.time ?? 30);

    // Set accessory information service
    InformationServiceHelper.setupService(platform, accessory, config);

    // Get the service if it exists, otherwise create a new service
    this._service = this.accessory.getService(hap.Service.WindowCovering)
      || this.accessory.addService(hap.Service.WindowCovering, config.name);
    this._service.setCharacteristic(hap.Characteristic.Name, accessory.displayName);

    // Each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/WindowCovering

    // Register handlers for the Characteristics
    this._service.getCharacteristic(hap.Characteristic.CurrentPosition)
      .onGet(() => this.getProperty(this._currentPosition));

    this._service.getCharacteristic(hap.Characteristic.PositionState)
      .onGet(() => this.getProperty(this._positionState));

    this._service.getCharacteristic(hap.Characteristic.TargetPosition)
      .onGet(() => this.getProperty(this._targetPosition))
      .onSet((value) => this.targetPosition_onSet(value));
  }

  async setGateway(gateway: EnoGateway): Promise<void> {
    this._gateway = gateway;

    // Register message receiver in the gateway
    await this._gateway.registerEnoAccessory(this.config, this.EnoGateway_eepMessageReceived.bind(this));

    // Allocate new or persisted sender ID

    this.accessory.context.localSenderIndex = gateway
      .claimSenderIndex(this.accessory.context.localSenderIndex);

    if (this.accessory.context.localSenderIndex === undefined) {
      this.platform.log.warn('Failed to claim individual sender id. The limit of 128 might be exceeded.');
    }

    this._senderId = gateway.getSenderId(this.accessory.context.localSenderIndex!);
    this.platform.log.info(`${this.accessory.displayName}: assigned local sender ID ${this._senderId?.toString()}`);
  }

  private _sendTimeout: NodeJS.Timeout | undefined;

  private async targetPosition_onSet(value: CharacteristicValue): Promise<void> {
    this.platform.log.info(`${this.accessory.displayName}: SET targetPosition ${value}`);

    if (value !== this._targetPosition) {

      const cmd = (value as number > this._targetPosition) ? 1 : 2;

      this._targetPosition = value as number;

      if (this._sendTimeout) {
        clearTimeout(this._sendTimeout);
      }
      this._sendTimeout = setTimeout(() => {

        if (this._gateway && this._senderId) {
          let erp1 = undefined;

          if (this.config.eepId.rorg === EnoCore.RORGs.FOURBS) {
            // Send Manufacturer specific 4BS message
            const time_s = Math.abs(this._targetPosition - this._currentPosition) / this._travelVelocity;
            erp1 = EnoMessageFactory.newFourBSGatewayBlindsMessageEltako(this._senderId, cmd, time_s);

          } else if (this.config.eepId.rorg === EnoCore.RORGs.VLD && this.config.eepId.func === 0x05) {
            // Blinds Control for position and angle
            erp1 = EnoMessageFactory.newVldBlindsControlMessage(
              this._senderId, this.config.devId, 1, 100 - this._targetPosition, 127);
          }

          if (erp1 !== undefined) {
            this._gateway.sendERP1Telegram(erp1);
          }
        }

      }, 1200);
    }
  }

  private EnoGateway_eepMessageReceived(message: ParsedMessage): void {

    this.platform.log.debug(`${this.accessory.displayName}: ${message.toString()}`);

    if (message.values.currentPosition !== undefined) {
      this.EnoGateway_updateByPositionReport(100 - message.values.currentPosition);
    } else if (message.values.state !== undefined) {

      let needInterval = false;
      const intervalDelay_s = 10 / this._travelVelocity;

      let state = this.platform.Characteristic.PositionState.STOPPED;
      let interpolatedPos = this._currentPosition;
      let confirmedPosition = undefined;
      switch (message.values.state) {
        case 'up':
          state = this.platform.Characteristic.PositionState.INCREASING;
          needInterval = true;
          break;

        case 'down':
          state = this.platform.Characteristic.PositionState.DECREASING;
          needInterval = true;
          break;

        case 'open':
          state = 2;
          interpolatedPos = 100;
          state = this.platform.Characteristic.PositionState.STOPPED;
          needInterval = false;
          confirmedPosition = 100;
          break;

        case 'closed':
          state = this.platform.Characteristic.PositionState.STOPPED;
          interpolatedPos = 0;
          needInterval = false;
          confirmedPosition = 0;
          break;

        default:
          state = this.platform.Characteristic.PositionState.STOPPED;
          needInterval = false;
          if (this._confirmedPosition !== undefined && message.values.stoppedAfter_s !== undefined) {
            confirmedPosition = this._confirmedPosition + (this._travelVelocity * message.values.stoppedAfter_s);
            confirmedPosition = Math.max(0, Math.min(100, confirmedPosition));
          }
          break;
      }

      if ((this._interval !== undefined) !== needInterval) {
        if (needInterval) {

          this._interval = setInterval(() => {
            if (message.values.state === 'up') {
              interpolatedPos += this._travelVelocity * intervalDelay_s;
            } else {
              interpolatedPos -= this._travelVelocity * intervalDelay_s;
            }

            interpolatedPos = Math.max(0, Math.min(100, interpolatedPos));
            this._currentPosition = Math.round(interpolatedPos);
            if (interpolatedPos === 100 || interpolatedPos === 0) {
              clearInterval(this._interval);
              this._interval = undefined;
            }

            this._currentPosition = this._targetPosition = Math.round(interpolatedPos);
            this.logInfoCurrentPositionAndState('(interpolated)');

            this._service.updateCharacteristic(this.hap.Characteristic.CurrentPosition, this._currentPosition);
            this._service.getCharacteristic(this.hap.Characteristic.TargetPosition)
              .sendEventNotification(this._targetPosition);
          }, intervalDelay_s * 1000);
        } else {
          clearInterval(this._interval);
          this._interval = undefined;
        }
      }

      if (confirmedPosition !== undefined) {
        this._confirmedPosition = confirmedPosition;
        this._targetPosition = confirmedPosition;
        interpolatedPos = confirmedPosition;
        this.platform.log.info(`${this.accessory.displayName}: position confirmed: ${interpolatedPos}`);
      }

      this._currentPosition = Math.round(interpolatedPos);
      this._service.updateCharacteristic(this.hap.Characteristic.CurrentPosition, this._currentPosition);
      this._service.getCharacteristic(this.hap.Characteristic.TargetPosition)
        .sendEventNotification(this._targetPosition);

      this.accessory.context.currentPosition = this._currentPosition;

      this._positionState = state;
      this._service.updateCharacteristic(this.hap.Characteristic.PositionState, this._positionState);

      this.logInfoCurrentPositionAndState();
    }
  }

  private EnoGateway_updateByPositionReport(currentPosition: number): void {

    let state = this.platform.Characteristic.PositionState.STOPPED;

    if (this._positionReportTimeout !== undefined) {
      clearTimeout(this._positionReportTimeout);
      this._positionReportTimeout = undefined;
    }

    if (this._currentPosition !== undefined) {
      const delta = currentPosition - this._currentPosition;
      if (delta > 0) {
        state = this.platform.Characteristic.PositionState.INCREASING;
      } else if (delta < 0) {
        state = this.platform.Characteristic.PositionState.DECREASING;
      }
    }

    if (currentPosition === 0 || currentPosition === 100) {
      state = this.platform.Characteristic.PositionState.STOPPED;
    }

    if (state !== this.platform.Characteristic.PositionState.STOPPED) {
      this._positionReportTimeout = setTimeout(() => {
        // Recursively call this method again to detect 'STOPPED'
        this.EnoGateway_updateByPositionReport(currentPosition);
      }, 3000);
    }

    this._positionState = state;
    this._service.updateCharacteristic(this.hap.Characteristic.PositionState, this._positionState);

    if (state === this.platform.Characteristic.PositionState.STOPPED) {
      this._targetPosition = currentPosition;
      this._service.updateCharacteristic(this.hap.Characteristic.TargetPosition, this._targetPosition);
    }

    this._currentPosition = currentPosition;
    this._service.updateCharacteristic(this.hap.Characteristic.CurrentPosition, this._currentPosition);
    this.accessory.context.currentPosition = this._currentPosition;

    this.logInfoCurrentPositionAndState();
  }

  private logInfoCurrentPositionAndState(suffix?: string) {
    const state = this._positionState === 2
      ? 'STOPPED' : this._positionState === 1
        ? 'INCREASING'
        : 'DECREASING';

    let message = `${this.accessory.displayName}: UPDATE currentPosition=${this._currentPosition} positionState=${state}`;
    if (suffix !== undefined) {
      message += ` ${suffix}`;
    }

    this.platform.log.info(message);
  }
}
