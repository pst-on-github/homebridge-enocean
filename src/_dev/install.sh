#/bin/bash

plugin_name="@pst-on-npm/homebridge-enocean"
homebridge_dir="/var/lib/homebridge"

install_dir="$homebridge_dir/node_modules/$plugin_name"

echo "Install to: $install_dir"
sudo rm -rf $install_dir
echo REMOVED 

sudo mkdir -p $install_dir

sudo cp config.schema.json $install_dir
sudo cp LICENSE            $install_dir
sudo cp package.json       $install_dir
sudo cp package-lock.json  $install_dir
sudo cp README.md          $install_dir
sudo cp -r dist            $install_dir
sudo cp -r node_modules    $install_dir

sudo chown -R homebridge $install_dir
sudo chgrp -R homebridge $install_dir
echo COPIED

ls $install_dir
