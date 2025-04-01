# Cheat sheet

## Trace transmitted messages

``` bash
ps -ef | grep homebridge # to get the pid
sudo strace -ff -e write --trace-path /dev/ttyUSB0 -xx -p <pid>

# Or combined to trace transmitted messages
sudo strace -ff -e write --trace-path /dev/ttyUSB0 -xx -p `pgrep homebridge:`
```

## Other

``` bash
lsof # list open files
jq   # pretty print JSON
```

## npm

``` bash
npm publish --tag=beta --access=public
npm dist-tag add @pst-on-npm/homebridge-enocean@1.m.b-beta.1 latest
```

## Complex config schemes layout examples

https://github.com/NorthernMan54/homebridge-alexa/blob/main/config.schema.json

https://github.com/nicoduj/homebridge-harmony/blob/Dynamic-Platform/config.schema.json
