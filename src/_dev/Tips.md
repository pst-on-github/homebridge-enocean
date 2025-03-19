# Tips

# trace serial

``` bash
ps -ef | grep homebridge # to get the pid
sudo strace -p <pid> -ff -e write --trace-path /dev/ttyUSB0 -xx
```

``` bash
lsof # list open files
```
