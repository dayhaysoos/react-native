/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

const copyProjectTemplateAndReplace = require('../generator/copyProjectTemplateAndReplace');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

/**
 * The eject command re-creates the `android` and `ios` native folders. Because native code can be
 * difficult to maintain, this new script allows an `app.json` to be defined for the project, which
 * is used to configure the native app.
 *
 * The `app.json` config may contain the following keys:
 *
 * - `name` - The short name used for the project, should be TitleCase
 * - `displayName` - The app's name on the home screen
 * - `icon` - The app's icon that can be set by a path string and will be used for every platform
 *          `ios` - path string to an icon to use for the ios platform
 *          `android` - path string to an icon to use for the android platform
 *          `default` - path string to an icon to use for both platforms. `android` and `ios` override this
 */

function eject() {

  const doesIOSExist = fs.existsSync(path.resolve('ios'));
  const doesAndroidExist = fs.existsSync(path.resolve('android'));
  if (doesIOSExist && doesAndroidExist) {
    console.error(
      'Both the iOS and Android folders already exist! Please delete `ios` and/or `android` ' +
      'before ejecting.'
    );
    process.exit(1);
  }

  let appConfig = null;
  try {
    appConfig = require(path.resolve('app.json'));
  } catch(e) {
    console.error(
      `Eject requires an \`app.json\` config file to be located at ` +
      `${path.resolve('app.json')}, and it must at least specify a \`name\` for the project ` +
      `name, and a \`displayName\` for the app's home screen label.`
    );
    process.exit(1);
  }

  const appName = appConfig.name;
  if (!appName) {
    console.error(
      `App \`name\` must be defined in the \`app.json\` config file to define the project name. `+
      `It must not contain any spaces or dashes.`
    );
    process.exit(1);
  }
  const displayName = appConfig.displayName;
  if (!displayName) {
    console.error(
      `App \`displayName\` must be defined in the \`app.json\` config file, to define the label ` +
      `of the app on the home screen.`
    );
    process.exit(1);
  }

  const iconConfig = (typeof appConfig.icon === 'string' ? {default: appConfig.icon} : appConfig.icon  ) || {};
  const appIconIOS = iconConfig.ios || iconConfig.default;
  const appIconAndroid = iconConfig.android || iconConfig.default;

  const templateOptions = { displayName };

  if (!doesIOSExist) {
    console.log('Generating the iOS folder.');
    copyProjectTemplateAndReplace(
      path.resolve('node_modules', 'react-native', 'local-cli', 'templates', 'HelloWorld', 'ios'),
      path.resolve('ios'),
      appName,
      templateOptions
    );

    console.log('Setting Up App Icons for iOS.')
    const pictureSizes = [40, 60, 58, 87, 80, 120, 180];
    const contentPath = `ios/${appName}/Images.xcassets/AppIcon.appiconset/Contents.json`;

    const fileNames = pictureSizes.reduce( (acc, size) => {
      const filePath = `ios/${appName}/Images.xcassets/AppIcon.appiconset/${size}pt-${appIconIOS}`;
      const fileName = `${size}pt-${appIconIOS}`;
      sharp(appIconIOS)
      .resize(size, size)
      .toFile(filePath, function(err) {
        if(err) throw err;
      });
      acc['SIZE_'+size] = fileName;
      return acc
    }, []);

    if ( typeof appIconIOS === 'string') {
      fs.readFile(contentPath, 'utf8', function (err, data) {
        if (err) throw err;
        let obj = JSON.parse(data);

        obj.images.forEach((image, key) => {
          let size = parseInt(image.size.split('x')[0]);
          let scale = parseInt(image.scale.replace('x', ''));
          let fileName = fileNames[`SIZE_${scale*size}`];
          obj.images[key].filename = fileName;
          return obj;
        })

        fs.writeFile(contentPath, JSON.stringify(obj), 'utf8', function(err){
          if(err) throw err;
        })
      });
    };

  }

  if (!doesAndroidExist) {
    console.log('Generating the Android folder.');
    copyProjectTemplateAndReplace(
      path.resolve('node_modules', 'react-native', 'local-cli', 'templates', 'HelloWorld', 'android'),
      path.resolve('android'),
      appName,
      templateOptions
    );

    console.log('Setting up App Icons for Android');

    const ICON_SIZES = [{
      android_hdpi: {
        path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
        size: 48
      },
      android_mdpi: {
        path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
        size: 72
      },
      android_xhdpi: {
        path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
        size: 96
      },
      android_xxhdpi: {
        path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
        size: 144
      }
    }];

    let filePaths = [];

    Object.keys(ICON_SIZES[0]).forEach((prop) => {
      filePaths.push(ICON_SIZES[0][prop].path);
    })

    const doesAppIconExist = fs.existsSync(path.resolve(appIconAndroid));

    if( typeof appIconAndroid === 'string' && doesAppIconExist) {
      filePaths.forEach((path) => {
        fs.unlink(path, (err) => {
          if(err) throw err;
        })
      })
    };

    Object.keys(ICON_SIZES[0]).forEach((prop) => {
      const path = ICON_SIZES[0][prop].path;
      const size = ICON_SIZES[0][prop].size;
      sharp(appIconAndroid)
      .resize(size, size)
      .toFile(path, function(err) {
        if (err) throw err;
      }) 
    });
  }

}

module.exports = {
  name: 'eject',
  description: 'Re-create the iOS and Android folders and native code',
  func: eject,
  options: [],
};
