/**
 * EnOcean accessory configuration interface
 * like it is used in the Homebridge config file
 */
export interface IDeviceConfig {

  id: string,
  eep: string,
  manufacturer: string;

  name?: string;
  model?: string;

  /**
   * Window Coverings (blinds): The travel time to calculate the percentage for Eltako shutter switches
   * Contact Sensor:            The time the contact stays open before Characteristic.StatusTampered.TAMPERED will be set.
   */
  time?: number;

  /**
   * Optionally override the accessory kind for the device.
   */
  accessoryKind?: string;
}
