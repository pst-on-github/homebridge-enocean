/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
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
  private readJsonFile(): any {
    const data = fs.readFileSync(this.configFilePath, 'utf-8');
    return JSON.parse(data);
  }

  // Writes the updated object back to the JSON file
  private writeJsonFile(data: any): void {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(this.configFilePath, jsonData, 'utf-8');
  }

  // Adds an item to the array and updates the JSON file
  public addDeviceToHomebridgeConfig(newItem: IDeviceConfig): void {
    
    const config = this.readJsonFile();

    const plugin = config.platforms.find((p: any) => p.platform === 'EnOcean');

    if (plugin === undefined) {
      throw new Error('EnOcean: no such platform in config');
    }
    if (plugin.accessories === undefined) {
      plugin.accessories = [];
    };

    const newEntry: IDeviceConfig = {
      id: newItem.id,
      eep: newItem.eep,
      name: newItem.name,
      model: newItem.model,
      manufacturer: newItem.manufacturer,
    };
    plugin.accessories.push(newEntry);
  
    this.writeJsonFile(config);
  }
}
