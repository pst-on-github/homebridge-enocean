<p align="center">
  <img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge EnOcean Platform

[![GitHub last commit](https://img.shields.io/github/last-commit/pst-on-github/homebridge-enocean.svg?style=plastic)](https://github.com/pst-on-github/homebridge-enocean)

Integrate EnOcean devices into Homebridge. Still *beta*!

## Platform configuration

Property | Description
-|-
name | Platform Name
comDevice | Path to the EnOcean device. E.g. `/dev/ttyUSB0`. USB300 type EnOcean transceiver.
isLearnSwitchEnabled | Learn Switch. If enabled, the plugin will create a switch accessory (EnOcean Learn) to switch learn/teach-in mode.
isHistoryServiceEnabled | Enable History Service for Eve App. If enabled, the plugin support the fakegato-history service to support history graphs in the Eve app. 

## EnOceanDevice configuration

Property | Description
-|-
eep | The EnOcean Equipment Profile (EEP) to be used for this device.
id | The EnOcean device ID. An eight digit hex number separated by a colon ':'. E.g. `1A:2B:3C:4D`. This number identifies the device uniquely within EnOcean scope.
name | The name of the device. This will be the initial name when the device appears in homebridge.
manufacturer | The name of the manufacturer of this device. Some manufacturers (like Eltako) support special features.
model | The name of the model.

## Supported devices

In order to teach-in new device some steps are necessary. The *Learn Switch* accessory hat
two functions if activated.

1. It enables the plug-in to listen for teach-in messages (4BS only actually). Could be considered inbound.
2. It enabled transmission of teach-in messages when a manually configured accessory is activated (i.e. switched on). That could be considered outbound.

Currently supported EnOcean Devices are:

### Temperature sensors EEP A5-02-xx

They just provide the temperature. Types (EEP) 0x01 to 0x1B and 0x20 and 0x30 are supported.
Tested with an STM3xx module (type 0x05). This EEP will always result in an accessory with a
primary Temperature Sensor Service.

1. Activate the *EnOcean Learn* accessory.
2. Command the device to transmit a learning message.

### Temperature and humidity sensors EEP A5-04-xx

Provides temperature and relative humidity. Type 0x01 and 0x02 are supported. Tested with Eltako FAFT60.
This EEP will always result in an accessory with a primary Temperature Sensor Service and a Humidity Service.
For Eltako model a Battery Service is supported as well.

1. Activate the *EnOcean Learn* accessory.
2. Command the device to transmit a learning message.

### Stateless Programmable Switches EEP F6-02-xx

They come with 2 rocker switches for the supported types 0x01 and 0x02. The four buttons will end up as
four stateless programmable switches. The single, double and long press events are supported
(not sure whether the double press makes sens though, it also delays the single press detection). 

1. Activate the *EnOcean Learn* accessory.
2. Just press the one of the rockers. There is no specific learn message.

### Outlets F6-02xx/A5-38-08

They can be controlled either using F6 (button) or A5-38-08 (Gateway, General Command, Switching) profile. Depending on the EEP this plugin will send according messages.

Some kind of aut-create is not jet implemented.

1. Set the outlet to learn mode
2. Activate the *EnOcean Learn* accessory
2. Click the socket accessory in Homebridge button once. This will send the learn telegram to the socket, depending on the EEP of the accessory (F6/A5).

#### Eltako FSSA-230V

No advantage using the A5 EEP as it does not automatically enable acknowledge telegrams from the socket.

#### Eltake FSLA-230V 

Using the A5 EEP automatically enabled the acknowledge telegrams from the socket.

## Unfinished stuff

* The learn mode (teach-in) can be activated by the build-in Learn Mode Switch Accessory and it will print teach-in telegrams in the logs. It will not yet change the json config file.

## Technical details

### fakegato

*fakegato* debug level logging is off by default (it just doesn't get the log instance forwarded, so you won't see more severe messages as well). To enable it mention `homebridge-enocean-fakegato` in the DEBUG environment variable. See *Homebridge > Settings > Startup & Environment > DEBUG*. 

## Acknowledgements

Thanks to [Henning Kerstan](https://github.com/henningkerstan) for the [enocean-core](https://github.com/henningkerstan/enocean-core) repo. That saved me to delve into the details of the EnOcean protocol, but also was a great resource for learning.

Also thanks to [simont77](https://github.com/simont77) for the [fakegato-history](https://github.com/simont77/fakegato-history) repo, which made it pretty easy to get the fancy history graphs in the Eve app.

---
