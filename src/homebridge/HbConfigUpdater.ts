/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs/promises';
import { IDeviceConfig } from './IDeviceConfig';

/**
 * EnOcean Device Configuration
 */
export class HbConfigUpdater {
 
  constructor(
    private configFilePath: string,
    private platformName: string,
  ) {
  }

  // Reads the JSON file and returns the parsed object
  private async readJsonFile(): Promise<any> {
    const data = await fs.readFile(this.configFilePath, 'utf-8');
    return JSON.parse(data);
  }

  // Writes the updated object back to the JSON file
  private async writeJsonFile(data: any): Promise<void> {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(this.configFilePath, jsonData, 'utf-8');
  }

  // Adds an item to the array and updates the JSON file
  public async addDeviceToHomebridgeConfig(newItem: IDeviceConfig): Promise<void> {
    
    const config = await this.readJsonFile();

    const plugin = config.platforms.find((p: any) => p.platform === this.platformName);

    if (plugin === undefined) {
      throw new Error(`${this.platformName}: no such platform in platforms in ${this.configFilePath}`);
    }

    if (plugin.devices === undefined) {
      plugin.devices = [];
    };

    const newEntry: IDeviceConfig = {
      name: newItem.name,
      id: newItem.id,
      eep: newItem.eep,
      model: newItem.model,
      manufacturer: newItem.manufacturer,
    };

    plugin.devices.push(newEntry);
  
    await this.writeJsonFile(config);
  }
}
