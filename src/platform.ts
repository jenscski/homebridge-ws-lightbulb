import {
  API,
  AccessoryConfig,
  AccessoryPlugin,
  Service,
  Logging,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
} from 'homebridge';

import { WebSocket } from '@oznu/ws-connect';

export class WsLightbulb implements AccessoryPlugin {

    private services: Service[] = [];

    private switchOn = false;
    private brightness = 0;

    private readonly ws: WebSocket;

    constructor(
        public readonly log: Logging,
        public readonly config: AccessoryConfig,
        public readonly api: API,
    ) {
      const lightbulbService = new this.api.hap.Service.Lightbulb(config.name);

      lightbulbService.getCharacteristic(this.api.hap.Characteristic.On)
        .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
          if (this.ws.isConnected()) {
            log.info('Current state of the switch was returned: ' + (this.switchOn ? 'ON' : 'OFF'));
            callback(undefined, this.switchOn);
          } else {
            callback(new Error('Offline'), this.switchOn);
          }
        })
        .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          this.switchOn = value as boolean;
          log.info('Switch state was set to: ' + (this.switchOn ? 'ON' : 'OFF'));

          if (this.ws.isConnected()) {
            this.ws.send(JSON.stringify({ power: this.switchOn, brightness: this.brightness }));
            callback();
          } else {
            callback(new Error('Offline'));
          }
        });

      lightbulbService.addCharacteristic(this.api.hap.Characteristic.Brightness)
        .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
          if (this.ws.isConnected()) {
            log.info('Current brightness of the switch was returned: ' + this.brightness);
            callback(undefined, this.brightness);
          } else {
            callback(new Error('Offline'), this.switchOn);
          }
        })
        .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          this.brightness = value as number;
          log.info('Switch brightness was set to: ' + this.brightness);

          if (this.ws.isConnected()) {
            this.ws.send(JSON.stringify({ power: this.switchOn, brightness: this.brightness }));
            callback();
          } else {
            callback(new Error('Offline'));
          }
        });

      this.services.push(lightbulbService);

      const informationService = new this.api.hap.Service.AccessoryInformation()
        .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Jens-Christian Skibakk')
        .setCharacteristic(this.api.hap.Characteristic.Model, 'WebSocket Lightbulb')
        .setCharacteristic(this.api.hap.Characteristic.SerialNumber, config.serial as string || 'n/a');

      this.services.push(informationService);

      const url = config.url as string;

      this.ws = new WebSocket(url, {
        options: {
          handshakeTimeout: 2000,
        },
      });

      this.ws.on('websocket-status', this.log.info.bind(this));

      this.ws.on('open', () => {
        //this.ws.send(JSON.stringify({ power: this.switchOn, brightness: this.brightness }));
      });

      this.ws.on('json', (json) => {
        this.switchOn = json.power as boolean;
        this.brightness = json.brightness as number;

        lightbulbService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(this.switchOn);
        lightbulbService.getCharacteristic(this.api.hap.Characteristic.Brightness).updateValue(this.brightness);
      });

      this.log.info('Light buld at \'' + config.url + '\' finished initializing!');
    }

    getServices(): Service[] {
      return this.services;
    }
}