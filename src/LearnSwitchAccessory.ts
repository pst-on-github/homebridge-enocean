import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { EnOceanHomebridgePlatform } from './platform.js';
import { EnoGateway } from './enocean/EnoGateway.js';

export interface LearnSwitchDevice {
  readonly name: string,
  readonly id: string,
}

/**
 * Switch accessory to turn the learn (teach-in) mode on and off.
 * If turned on it will automatically turn off after 3 minutes.
 */
export class LearnSwitchAccessory {

  private _gateway: EnoGateway | undefined;

  private service: Service;
  private state = {
    On: false,
  };

  static readonly Device: LearnSwitchDevice = {
    name: 'EnOcean Learn',
    id: 'enocean-learn-switch-0815',
  };

  constructor(
    private readonly platform: EnOceanHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'pst-on-github')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, platform.version);

    // Get the Switch service if it exists, otherwise create a new Switch service
    // you can create multiple services for each accessory

    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, 'EnOcean Learn');

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Switch

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below
  }

  async setGateway(gateway: EnoGateway): Promise<void> {
    this._gateway = gateway;

    // Register for stopLearning event
    this._gateway.addStoppedLearningEventListener(() => {
      this.state.On = false;
      this.service.updateCharacteristic(this.platform.Characteristic.On, this.state.On);
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    this.state.On = value as boolean;

    if (this._gateway !== undefined) {
      if (this.state.On) {
        this._gateway.startLearning(120);
      } else {
        this._gateway.stopLearning();
      }
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   */
  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.state.On;
    return isOn;
  }
}
