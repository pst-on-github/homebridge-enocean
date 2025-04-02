import type { EnOceanHomebridgePlatform } from '../platform';

import * as EnoCore from 'enocean-core';

import { IEnoAccessory } from './IEnoAccessory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { EnoGateway } from '../enocean/EnoGateway';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';
import { EnoAccessory } from './EnoAccessory';
import { ParsedMessage } from '../eepParser/ParsedMessage';
import { PlatformAccessory } from 'homebridge';

/**
 * An abstract class representing an accessory that can transmit EnOcean messages.
 * This class extends `EnoAccessory` and implements `IEnoAccessory`.
 * It provides functionality to set up a gateway, manage sender IDs, and send ERP1 telegrams.
 *
 * @abstract
 */
export abstract class EnoTransmittingAccessory extends EnoAccessory implements IEnoAccessory {

  protected _gateway: EnoGateway | undefined;
  protected _senderId: EnoCore.DeviceId | undefined;

  /**
   * Constructs a new instance of the `EnoTransmittingAccessory` class.
   *
   * @param platform - The EnOcean Homebridge platform instance.
   * @param accessory - The platform accessory associated with this EnOcean accessory.
   * @param config - The device configuration for this accessory.
   */
  constructor(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
  ) {
    super(platform, accessory, config);
  }

  /**
   * Sets the gateway for this accessory and allocates a sender ID.
   * Registers the accessory with the gateway and sets up message handling.
   *
   * @param gateway - The EnOcean gateway to associate with this accessory.
   * @returns A promise that resolves when the gateway is successfully set.
   * @throws A warning is logged if the sender ID cannot be claimed due to exceeding the limit.
   */
  async setGateway(gateway: EnoGateway): Promise<void> {
    this._gateway = gateway;

    // Allocate new or persisted sender ID
    this.accessory.context.localSenderIndex = gateway
      .claimSenderIndex(this.accessory.context.localSenderIndex);

    if (this.accessory.context.localSenderIndex !== undefined) {
      this._senderId = gateway.getSenderId(this.accessory.context.localSenderIndex);
    } else {
      this.platform.log.warn(`${this.accessory.displayName}: Failed to claim individual sender id. The limit of 128 might be exceeded.`);
    }

    // Register message receiver and senderId in the gateway
    return this._gateway.registerEnoAccessory(this.config, this.EnoGateway_eepMessageReceived.bind(this), this._senderId);
  }

  /**
   * Sends an ERP1 telegram using the associated gateway.
   *
   * @param telegram - The ERP1 telegram to send.
   * @returns A promise that resolves when the telegram is successfully sent.
   * @throws An error if no gateway is defined or if the local sender ID is not defined.
   */
  protected async sendErp1Telegram(telegram: EnoCore.ERP1Telegram) {

    if (this._gateway === undefined) {
      throw 'Invalid operation: No gateway devined';
    }

    if (this._senderId === undefined) {
      throw 'Invalid Operation: local sender ID not defined';
    }
    
    telegram.sender = this._senderId;
    telegram.destination = this.config.devId;
      
    return this._gateway.sendErp1Telegram(telegram);
  }

  /**
   * Abstract method to handle received EnOcean messages.
   * This method must be implemented by subclasses to define specific behavior
   * when a message is received from the gateway.
   *
   * @param message - The parsed EnOcean message received from the gateway.
   */
  protected abstract EnoGateway_eepMessageReceived(message: ParsedMessage): void;
}
