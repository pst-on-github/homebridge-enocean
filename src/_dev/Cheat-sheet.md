# Cheat sheet

## trace serial

``` bash
ps -ef | grep homebridge # to get the pid
sudo strace -p <pid> -ff -e write --trace-path /dev/ttyUSB0 -xx
```

``` bash
lsof # list open files
jq   # pretty print JSON
```

``` bash
npm publish --tag=beta --access=public
npm dist-tag add @pst-on-npm/homebridge-enocean@1.m.b-beta.1 latest
```