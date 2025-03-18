<p align="center">
  <img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge EnOcean Platform

[![GitHub last commit](https://img.shields.io/github/last-commit/pst-on-github/homebridge-enocean.svg?style=plastic)](https://github.com/pst-on-github/homebridge-enocean)

Integrate EnOcean devices into Homebridge. Still *beta*!

## Supported EEPs

The plugin assigns accessories depending on the EEP. This can be overwritten in the config. Might be useful for contacts.

EEP | Accessory | EEP types
-|-|-
A5-02 | Temperature Sensors |  01 to 1B and 20 and 30
A5-04 | Temperature Sensors |  01 and 02
A5-08 | Motion Sensors |  01, 02 and 03
A5-10 | Leak Sensor | 0B - Temperature Sensor and Single Input Contact
A5-14 | Contact Sensor | 09 - Window/Door-Sensor with States Open/Closed/Tilt, Supply voltage monitor
A5-30 | Contact Sensor | Digital Input 
A5-38-08 | Outlet | Central Command, Gateway type 08 is supported
A5-3F-7F Eltako | Window Covering | 7F Eltako specific
D1-Eltako | none | Used for auto teach-in with Eltako devices
D2-05.ts | Window Covering | 00 (not fully test)
F6 | Switches | Programmable switch | various

Some accessories support multiple services. History service is provided by the fakegato module.

Accessories | Services and Characteristics (main service first)
-|-
Contact Sensor | ContactSensor, Battery, History 
Leak Sensor | LeakSensor, TemperatureSensor, Battery, History
Motion Sensor | MotionSensor, Battery, LightSensor, History
Outlet | Outlet
ProgrammableSwitch | StatelessProgrammableSwitch
Temperature Sensor | TemperatureSensor, HumiditySensor, Battery, History
Window Covering | WindowCovering 

## Platform configuration

Property | Description
-|-
name | Platform Name
comDevice | Path to the EnOcean device. E.g. `/dev/ttyUSB0`. USB300 type EnOcean transceiver.
isLearnSwitchEnabled | Learn Switch. If enabled, the plugin will create a switch accessory (EnOcean Learn) to switch learn/teach-in mode.
isHistoryServiceEnabled | Enable History Service for Eve App. If enabled, the plugin support the fakegato-history service to support history graphs in the Eve app. 

Maybe it is a good idea to use the is-path for `comDevice`, like `/dev/serial/usb-EnOcean_GmbH_EnOcean_USB_300_DB_<some-id>-if00-port0`. That way homebridge can access the device if you plug it to another USB port.

If you see 'access denied' in the logs, for the com device, you might need to add homebridge to the plogdev group (`adduser homebridge plugdev` on raspian).

## EnOceanDevice configuration

Property | Description
-|-
eep | The EnOcean Equipment Profile (EEP) to be used for this device.
id | The EnOcean device ID. An eight digit hex number separated by a colon ':'. E.g. `1A:2B:3C:4D`. This number identifies the device uniquely within EnOcean scope.
name | The name of the device. This will be the initial name when the device appears in homebridge.
manufacturer | The name of the manufacturer of this device. Some manufacturers (like Eltako) support special features.
model | The name of the model.
time | See description in the UI
accessoryKind | Allows to override the created accessory. By default (auto) it is  determined by the EEP.

## Teach-in

In order to teach-in (learn) new devices a *Learn Switch* accessory is provides.

1. It enables the plug-in to listen to teach-in messages. They are written to the logs.
2. It enabled transmission of teach-in messages when a manually configured accessory is activated (i.e. switched on). 

### Auto create 

Sone devices send an indication of their EEP and manufacturer if they are placed into teach-in mode. If possible they are automatically created and added to the configuration.

### Manual teach-in

#### Devices with a teach button (unidirectional sensors):

1. Activate the *EnOcean Learn* accessory.
2. Command the device to transmit a learning message.

#### Switches

Configure them manually. Turn on the *EnOcean Learn* accessory to capture the EnOID from the logs.

They come with 2 rocker switches for the supported types 0x01 and 0x02. The four buttons will end up as four stateless programmable switches. The single, double and long press events are supported (not sure whether the double press makes sens though, it also delays the single press detection). 

#### Outlet actors F6-02-xx/A5-38-08

Some of them support auto create when they are set to learn mode.

##### Eltako FSSA-230V

1. Configuring the FSSA in homebridge

    1. To figure out the EnoID turn on the confirmation telegrams at the FSSA and activate the *EnOcean Learn* accessory. Monitor the homebridge log while switching the FSSA using the right button, note the EnOID.

    2. Manually create a device in the homebridge configuration using the EnOID and EEP `A5-38-08` or `F6-02-01`. Reboot homebridge. The FSSA should now appear as accessory in homebridge.

2. Teach-in homebridge to the FSSA

    1. Set the FSSA to learn mode (left button 1 s, right button 2 times)
    2. Activate the *EnOcean Learn* accessory.
    3. Click the FSSA accessory. This will send a teach-in message to the FSSA. 
    4. Torn off the *EnOcean Learn* accessory.
    5. Verify switching the FSSA from homebridge.
    6. Verify confirmation telegrams are working by switching the FSSA using the right button.

Note: No advantage using the A5 EEP as it does not automatically enable acknowledge telegrams from the socket. They need to be enabled manually.

#### Eltake FSLA-230V 

Using the A5 EEP automatically enabled the acknowledge telegrams from the socket.

## Technical details

### fakegato

*fakegato* debug level logging is off by default (it just doesn't get the log instance forwarded, so you won't see more severe messages as well). To enable it mention `homebridge-enocean-fakegato` in the DEBUG environment variable. See *Homebridge > Settings > Startup & Environment > DEBUG*. 

## Acknowledgements

Thanks to [Henning Kerstan](https://github.com/henningkerstan) for the [enocean-core](https://github.com/henningkerstan/enocean-core) repo. That saved me to delve into the details of the EnOcean protocol, but also was a great resource for learning.

Also thanks to [simont77](https://github.com/simont77) for the [fakegato-history](https://github.com/simont77/fakegato-history) repo, which made it pretty easy to get the fancy history graphs in the Eve app.

---
