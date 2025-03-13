import { PlatformAccessory, Service } from 'homebridge';

import type { EnOceanHomebridgePlatform } from '../platform';

import { IEnoAccessory } from './IEnoAccessory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { ButtonEventManager } from './ButtonEventManager';
import { EnoGateway } from '../enocean/EnoGateway';
import { InformationServiceHelper } from '../serviceHelper/InformationServiceHelper';
import { EnoAccessoryContext } from '../homebridge/EnoAccessoryContext';
import { EnoAccessory } from './EnoAccessory';
import { ParsedMessage } from '../eepParser/ParsedMessage';

class SwitchButton {

  private readonly _eventManager: ButtonEventManager;
  public switchEvent: number = 0;

  constructor(
    private _platform: EnOceanHomebridgePlatform,
    private _service: Service,
    private _config: DeviceConfig,
    private readonly _labelIndex: number,
  ) {
    // Each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/StatelessProgrammableSwitch
    this._service.getCharacteristic(_platform.Characteristic.ServiceLabelIndex).setValue(this._labelIndex);
    this._service.getCharacteristic(_platform.Characteristic.ProgrammableSwitchEvent).onGet(() => {
      return this.switchEvent;
    });

    this._eventManager = new ButtonEventManager((switchEvent: number) => {
      _platform.log.info(`${this._service.displayName}: `
        + `${switchEvent === 1 ? 'DOUBLE_PRESS' : switchEvent === 0 ? 'SINGLE_PRESS' : 'LONG_PRESS'}`);
      this.switchEvent = switchEvent;
      this._service.getCharacteristic(this._platform.Characteristic.ProgrammableSwitchEvent)
        .sendEventNotification(switchEvent);
    }, this._platform.api.hap);
  }

  buttonPressed(): void {
    this._eventManager.buttonPressed();
  }

  buttonReleased(): void {
    this._eventManager.buttonReleased();
  }
}

/**
 * EnoSwitchAccessory
 * An instance of this class is created for each Switch
 */
export class StatelessProgrammableSwitchAccessory extends EnoAccessory implements IEnoAccessory {

  private _gateway: EnoGateway | undefined;
  private _switchButtons: Map<string, SwitchButton> = new Map();
  private _buttonSubTypes: string[] = ['AI', 'A0', 'BI', 'B0'];

  constructor(
    platform: EnOceanHomebridgePlatform,
    accessory: PlatformAccessory<EnoAccessoryContext>,
    config: DeviceConfig,
  ) {
    super(platform, accessory, config);

    // Set accessory information service
    InformationServiceHelper.setupService(platform, accessory, config);

    // Create the four buttons as StatelessProgrammableSwitch services
    for (let i = 0; i < this._buttonSubTypes.length; i++) {
      const service = accessory.getServiceById(this.platform.Service.StatelessProgrammableSwitch, this._buttonSubTypes[i])
        || accessory.addService(this.platform.Service.StatelessProgrammableSwitch,
          config.name + ' ' + this._buttonSubTypes[i], this._buttonSubTypes[i]);
      const button = new SwitchButton(platform, service, config, i + 1);
      this._switchButtons.set(this._buttonSubTypes[i], button);
    }
  }

  async setGateway(gateway: EnoGateway): Promise<void> {
    this._gateway = gateway;
    // Register message receiver in the gateway
    await this._gateway.registerEnoAccessory(this.config, this.EnoGateway_eepMessageReceived.bind(this));
  }

  private EnoGateway_eepMessageReceived(message: ParsedMessage): void {
    this.platform.log.debug(`${this.accessory.displayName}: ${message.toString()}`);

    if (message.values.isPressed && message.values.buttons) {
      for (const mButton of message.values.buttons) {
        const button = this._switchButtons.get(mButton);
        if (!button) {
          this.platform.log.warn(`${mButton}: no such button`);
          continue;
        }

        button.buttonPressed();
      }
    } else {
      // Always release all buttons, as we don't know which one was released
      for (const button of this._switchButtons.values()) {
        button.buttonReleased();
      }
    }
  }
}
