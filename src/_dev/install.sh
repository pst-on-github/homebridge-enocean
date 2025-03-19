#/bin/bash


#sudo cp -r ../homebridge-enocean/ /var/lib/homebridge/node_modules/@pst-on-github

sudo rm -rf /var/lib/homebridge/node_modules/homebridge-enocean
echo REMOVED 

sudo mkdir /var/lib/homebridge/node_modules/homebridge-enocean/

sudo cp config.schema.json /var/lib/homebridge/node_modules/homebridge-enocean/
sudo cp LICENSE            /var/lib/homebridge/node_modules/homebridge-enocean/
sudo cp package.json       /var/lib/homebridge/node_modules/homebridge-enocean/
sudo cp package-lock.json  /var/lib/homebridge/node_modules/homebridge-enocean/
sudo cp README.md          /var/lib/homebridge/node_modules/homebridge-enocean/
sudo cp -r dist            /var/lib/homebridge/node_modules/homebridge-enocean/
sudo cp -r node_modules    /var/lib/homebridge/node_modules/homebridge-enocean/

sudo chown -R homebridge /var/lib/homebridge/node_modules/homebridge-enocean/
sudo chgrp -R homebridge /var/lib/homebridge/node_modules/homebridge-enocean/
echo COPIED

ls /var/lib/homebridge/node_modules/homebridge-enocean/
