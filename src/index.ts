import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { WsLightbulb } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerAccessory(PLATFORM_NAME, WsLightbulb);
};
