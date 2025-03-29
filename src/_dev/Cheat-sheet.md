# Cheat sheet


``` bash
ps -ef | grep homebridge # to get the pid
sudo strace -ff -e write --trace-path /dev/ttyUSB0 -xx -p <pid>
# Or combined
sudo strace -ff -e write --trace-path /dev/ttyUSB0 -xx -p `pgrep homebridge`
```

``` bash
lsof # list open files
jq   # pretty print JSON
```

``` bash
npm publish --tag=beta --access=public
npm dist-tag add @pst-on-npm/homebridge-enocean@1.m.b-beta.1 latest
```