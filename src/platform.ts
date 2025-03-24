import * as fs from 'fs';
import { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import path from 'path';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

import { DeviceConfig } from './homebridge/DeviceConfig';
import { AccessoryFactory } from './accessories/AccessoryFactory';
import { IEnoAccessory } from './accessories/IEnoAccessory';
import { EnoGateway } from './enocean/EnoGateway';
import { LearnSwitchAccessory, LearnSwitchDevice } from './LearnSwitchAccessory';
import { EnoAccessoryContext } from './homebridge/EnoAccessoryContext';
import { HbConfigUpdater } from './homebridge/HbConfigUpdater';
import * as EnOCore from 'enocean-core';
import { EnoMessageFactory } from './enocean/EnoMessageFactory';
import { Util } from './util';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class EnOceanHomebridgePlatform implements DynamicPlatformPlugin {

  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  /**
   * History support for the Elgato Eve App */
  FakeGatoHistoryService;

  /**
   * The version string of this platform accessory.
   * Keep it semver compliant (http://semver.org) */
  version: string;

  // This is used to track restored cached accessories
  private readonly cachedAccessoriesByUUID: Map<string, PlatformAccessory> = new Map();

  // All enocean accessories we are aware of
  private readonly discoveredAccessoriesByUUID: Map<string, IEnoAccessory> = new Map();

  // All enocean accessories we validated from the configuration
  private readonly configuredDevicesByUUID: Map<string, DeviceConfig> = new Map();

  // Valid after DiscoverDevices, requires async/await
  private readonly _enoGateway: EnoGateway;

  private enoAccessoryFactory: AccessoryFactory;


  /**
   * Constructs a new instance of the platform.
   * 
   * @param log - The logging utility.
   * @param config - The platform configuration.
   * @param api - The Homebridge API.
   * 
   * Initializes the platform with the provided configuration and sets up the necessary services and event listeners.
   * 
   * - Initializes the HAP Service and Characteristic.
   * - Retrieves the platform version.
   * - Optionally sets up the FakeGato history service if enabled in the configuration.
   * - Creates a new EnOcean gateway with the specified communication device.
   * - Initializes the accessory factory.
   * - Registers event listeners for Homebridge lifecycle events:
   *   - `didFinishLaunching`: Discovers and registers devices as accessories.
   *   - `shutdown`: Handles platform shutdown.
   * 
   * Logs the initialization process and important events for debugging purposes.
   */
  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('New EnOcean gateway with device ', this.config.comDevice);
    this.version = this.getVersion();

    if (config.isHistoryServiceEnabled) {
      // See: https://github.com/simont77/fakegato-history
      this.log.debug('New fakegato history service');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.FakeGatoHistoryService = require('fakegato-history')(this.api);
    }

    this._enoGateway = new EnoGateway(this.config.comDevice, log);
    this.enoAccessoryFactory = new AccessoryFactory();

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');

      // Run the method to discover / register your devices as accessories
      await this.discoverDevices();

      // Print a table with all configured devices
      if (this.discoveredAccessoriesByUUID.size > 0) {
        const table3 = Array.from(this.discoveredAccessoriesByUUID.values()).map(d => d.config);
        console.table(table3, ['name', 'id', 'eep', 'model', 'manufacturer']);
        console.table(table3, ['name', 'time', 'accessoryKind', 'manufacturerId']);
      } else {
        log.info('No EnOcean devices configured');
      }
    });

    this.api.on('shutdown', () => {
      this.log.debug('shutting down');
    });

    this.log.debug('Finished initializing platform:', this.config.name);
  }

  /**
   * Configures an accessory that has been restored from the cache.
   * Invoked when homebridge restores cached accessories from disk at startup.
   * 
   * @param accessory - The accessory to configure.
   * 
   * This method logs the loading of the accessory and adds it to the accessories cache.
   * The cache helps in tracking if the accessory has already been registered.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // Add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.cachedAccessoriesByUUID.set(accessory.UUID, accessory as PlatformAccessory<EnoAccessoryContext>);
  }

  /**
   * Discovers and initializes devices based on the current configuration and cached accessories.
   * 
   * This method performs the following steps:
   * 1. Starts the EnOcean gateway.
   * 2. Initializes a map of cached accessories.
   * 3. Manages the Learn Switch accessory if it is enabled in the configuration.
   * 4. Validates and configures accessories from the configuration.
   * 5. Sets the teach-in listener for new devices.
   * 6. Initializes or removes cached accessories based on the current configuration.
   * 7. Teaches devices that are configured but not cached.
   * 
   * @returns {Promise<void>} A promise that resolves when the discovery process is complete.
   */
  private async discoverDevices(): Promise<void> {

    try { 
      await this._enoGateway.start();
    } catch (error) {
      this.log.error('Failed to start EnOcean gateway:', error);
      return;
    }

    const cached = new Map(this.cachedAccessoriesByUUID); // Assume all orphans

    // New Learn Switch Accessory, if configured
    if (this.config.isLearnSwitchEnabled) {
      const learnSwitchAccessory = this.manageLearnSwitchAccessory();
      cached.delete(learnSwitchAccessory.UUID);
    }

    // Validate configured devices
    if (Array.isArray(this.config.devices)) {
      for (const a of this.config.devices) {
        let devConfig;
        try {
          devConfig = new DeviceConfig(a.id, a.eep, a.name, a.manufacturer, a.model);
          devConfig.time = a.time;
          devConfig.accessoryKind = a.accessoryKind;
          devConfig.localSenderIndex = a.localSenderIndex;
        } catch (error) {
          this.log.warn(`${a.name}: Skipping device. Wrong configuration. Check EnOID and EEP. ${error}`);
          continue;
        }
        const uuid = this.api.hap.uuid.generate(devConfig.devId.toString());

        if (this.configuredDevicesByUUID.has(uuid)) {
          this.log.warn(`${devConfig.name}: Skipping device. Duplicate EnOID: ${devConfig.devId}`);
          continue;
        }

        this.configuredDevicesByUUID.set(uuid, devConfig);
      }
    }

    // Set the teach in listener
    this._enoGateway.addDeviceTeachInEventListener(this.enoGateway_teachInNewDevice.bind(this));

    // It is important that the existing accessories are initialized first,
    // so they can retrieve their already allocated sender id (from the pool of
    // ids given by BaseID + 0..127)

    // Loop over the cached ones and initialize or remove if they are not configured any longer
    for (const [key, value] of cached.entries()) {
      // Check if this cached accessory is still in the configuration
      const devConfig = this.configuredDevicesByUUID.get(key);
      if (devConfig) {
        // teach the device and rely on the teach in callback
        await this._enoGateway.teachDevice(devConfig);
      } else {
        this.log.info(`${value.displayName}: removing abandoned cached accessory`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [value]);
        this.cachedAccessoriesByUUID.delete(key);
      }
    }

    // Loop over the configured ones that were not cached.
    // They might retrieve new sender IDs.
    for (const [key, value] of this.configuredDevicesByUUID.entries()) {
      if (!cached.has(key)) {
        await this._enoGateway.teachDevice(value);
      }
    }
  }

  /**
   * Handles the teach-in process for a new EnOcean device.
   * 
   * This method performs different actions based on the teach-in method and the state of the device
   * (whether it is cached, configured, or new). It updates existing accessories, creates new ones,
   * and registers them with the Homebridge platform.
   * 
   * @param info - The device information containing details such as deviceId, eep, manufacturer, 
   *               teachInMethod, and label.
   * 
   * @returns A promise that resolves when the teach-in process is complete.
   * 
   * The method performs the following actions based on the teach-in method and device state:
   * - If the device is manually taught-in, cached, and configured, it updates the existing accessory.
   * - If the device is manually taught-in, not cached, but configured, it creates a new accessory.
   * - If the device is not manually taught-in, not cached, and not configured, it creates a new accessory
   *   received via teach-in telegram.
   * - If the device is manually taught-in, not cached, and not configured, it creates a new accessory
   *   received via MSC teach-in telegram (ELTAKO).
   * - If none of the above conditions are met, it logs a warning message and ignores the device.
   * 
   * The method also handles errors during the accessory creation and update processes, logging warnings
   * if any errors occur.
   */
  private async enoGateway_teachInNewDevice(info: EnOCore.DeviceInfo): Promise<void> {

    const uuid = this.api.hap.uuid.generate(info.deviceId.toString());
    const cachedAccessory = this.cachedAccessoriesByUUID.get(uuid);
    const isManualTeachIn = (info.teachInMethod === EnOCore.TeachInMethods.Manual);
    const teachInMethod = EnOCore.TeachInMethods[info.teachInMethod];
    let deviceConfig = this.configuredDevicesByUUID.get(uuid);

    if (isManualTeachIn && cachedAccessory && deviceConfig) {
      // Update existing accessory
      try {
        const device = this.enoAccessoryFactory
          .newAccessory(deviceConfig.eep, this, cachedAccessory as PlatformAccessory<EnoAccessoryContext>, deviceConfig);
        cachedAccessory.context = cachedAccessory.context ?? new EnoAccessoryContext();

        await device.setGateway(this._enoGateway);

        this.api.updatePlatformAccessories([cachedAccessory]);
        this.log.success(`${cachedAccessory.displayName} (${device.constructor.name}): updated accessory from cache`);
        this.discoveredAccessoriesByUUID.set(uuid, device);
      } catch (error) {
        this.log.warn(`${cachedAccessory.displayName}: failed to update cached accessory. ${error}`);
      }
    } else if (isManualTeachIn && !cachedAccessory && deviceConfig) {
      // Create new accessory
      const accessory = new this.api.platformAccessory<EnoAccessoryContext>(deviceConfig.name, uuid);
      accessory.context = accessory.context ?? new EnoAccessoryContext();
      accessory.context.localSenderIndex = (deviceConfig.localSenderIndex) ?? undefined;

      try {
        const device = this.enoAccessoryFactory.newAccessory(deviceConfig.eep, this, accessory, deviceConfig);

        await device.setGateway(this._enoGateway);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.success(`${accessory.displayName} (${device.constructor.name}): registered new accessory`);
        this.discoveredAccessoriesByUUID.set(deviceConfig.devId.toString(), device);
      } catch (error) {
        this.log.warn(`${deviceConfig.name}: failed to create accessory. ${error}`);
      }
    } else if (!isManualTeachIn && !cachedAccessory && !deviceConfig) {
      // Create new accessory received via teach in telegram
      deviceConfig = new DeviceConfig(
        info.deviceId.toString(),
        info.eep.toString(),
        `New ${EnOCore.Manufacturers[info.manufacturer]}`,
        EnOCore.Manufacturers[info.manufacturer],
      );
      const accessory = new this.api.platformAccessory<EnoAccessoryContext>(deviceConfig.name, uuid);
      accessory.context = accessory.context ?? new EnoAccessoryContext();

      if (info.localId) {
        accessory.context.localSenderIndex = this._enoGateway.getSenderIndex(info.localId);
        this.log(`${accessory.displayName}: ${teachInMethod} teach-in with local sender ID ${info.localId.toString()} `
          + `-> sender Index: ${accessory.context.localSenderIndex}`);
      }

      try {
        const device = this.enoAccessoryFactory.newAccessory(deviceConfig.eep, this, accessory, deviceConfig);
        await device.setGateway(this._enoGateway);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.success(`${accessory.displayName} (${device.constructor.name}): registered new accessory by ${teachInMethod}`);
        this.discoveredAccessoriesByUUID.set(uuid, device);

        const configUpdater = new HbConfigUpdater(this.api.user.configPath(), PLATFORM_NAME);
        configUpdater.addDeviceToHomebridgeConfig(deviceConfig);
        this.configuredDevicesByUUID.set(uuid, deviceConfig);

      } catch (error) {
        this.log.warn(`${deviceConfig.name}: failed to create new accessory by ${teachInMethod}. ${error}`);
      }
    } else if (isManualTeachIn && !cachedAccessory && !deviceConfig) {
      // Create new accessory received via MSC teach in telegram (ELTAKO)

      deviceConfig = this._enoGateway.armedConfig;
      if (deviceConfig === undefined) {
        throw new Error('Attempt to teach-in a new Eltako device but deviceConfig is undefined');
      }

      const id = Util.getTimeAsFourDigitString();
      deviceConfig.name = `${EnOCore.Manufacturers[deviceConfig.manufacturerId]}-${deviceConfig.model}-${id}`;

      const accessory = new this.api.platformAccessory<EnoAccessoryContext>(deviceConfig.name, uuid);
      accessory.context = new EnoAccessoryContext();

      try {
        const device = this.enoAccessoryFactory.newAccessory(deviceConfig.eep, this, accessory, deviceConfig);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        await device.setGateway(this._enoGateway);
        this.log.success(`${accessory.displayName} (${device.constructor.name}): registered new accessory by Eltako MSC`);
        this.discoveredAccessoriesByUUID.set(uuid, device);

        const configUpdater = new HbConfigUpdater(this.api.user.configPath(), PLATFORM_NAME);
        configUpdater.addDeviceToHomebridgeConfig(deviceConfig);
        this.configuredDevicesByUUID.set(uuid, deviceConfig);

        // Send the teach message to the device
        if (accessory.context.localSenderIndex !== undefined) {

          const senderIndex = accessory.context.localSenderIndex;
          const eepId = deviceConfig.eepId;
          const manufacturerId = deviceConfig.manufacturerId;
          setTimeout(() => {
            const localId = this._enoGateway.getSenderId(senderIndex);
            this.log.info(`Sending teach in to '${accessory.displayName}' with local ID '${localId.toString()}'`);
            const erp1TeachIn = EnoMessageFactory
              .new4bsTeachInMessage(localId, eepId, manufacturerId);
            this._enoGateway.sendERP1Telegram(erp1TeachIn);
          }, 3000);

        } else {
          this.log.warn(`Cannot send teach in to '${accessory.displayName}': No local ID was provided`);
        }

      } catch (error) {
        this.log.warn(`${deviceConfig.name}: failed to create new accessory by Eltako MSC. ${error}`);
      }
    } else {

      let message = `${info.deviceId.toString()}: ignoring device while teach-in (${teachInMethod}).`;

      if (deviceConfig?.name) {
        message += ` It is already known as '${deviceConfig.name}'.`;
      }

      this.log.warn(message);
    }
  }

  /**
   * Manages the Learn Switch Accessory by either updating an existing accessory from the cache
   * or registering a new accessory if it does not exist.
   *
   * @returns {PlatformAccessory<LearnSwitchDevice>} The managed Learn Switch Accessory.
   */
  private manageLearnSwitchAccessory(): PlatformAccessory<LearnSwitchDevice> {
    // Learn Switch Accessory
    const uuid = this.api.hap.uuid.generate(LearnSwitchAccessory.Device.id);
    const existingAccessory = this.cachedAccessoriesByUUID.get(uuid) as PlatformAccessory<LearnSwitchDevice>;

    if (existingAccessory) {
      existingAccessory.context = LearnSwitchAccessory.Device;
      this.api.updatePlatformAccessories([existingAccessory]);
      new LearnSwitchAccessory(this, existingAccessory)
        .setGateway(this._enoGateway);
      this.log.success(`${existingAccessory.displayName}: updated accessory from cache`);
      return existingAccessory;
    }

    const accessory = new this.api.platformAccessory<LearnSwitchDevice>(LearnSwitchAccessory.Device.name, uuid);

    accessory.context = LearnSwitchAccessory.Device;
    new LearnSwitchAccessory(this, accessory)
      .setGateway(this._enoGateway);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.log.success(`${accessory.displayName}: registered new accessory`);

    return accessory;
  }

  /**
   * Retrieves the version number from the package.json file.
   *
   * @returns {string} The version number specified in the package.json file.
   */
  private getVersion(): string {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
    const parsedPackageJson = JSON.parse(packageJson) as { version: string };
    return parsedPackageJson.version;
  }
}
