const { utils: { fromBuildIdentifier } } = require('@electron-forge/core');
require('dotenv').config();
const path = require('path');
const password = `@keychain:SINGULARITY_DEV_PASS`;
module.exports = {
    buildIdentifier: process.env.BUILD_ENV,
    packagerConfig: fromBuildIdentifier({
        prod: {
            asar: false,
            overwrite: true,
            "ignore": [
              "/bin/",
              "/obj/",
              "/out/",
              "/.git/",
              "/node_modules/",
              "/package-lock.json",
              "/entitlements.plist",
              "forge.config.js",
              "/tslint.json",
              "/.editorconfig",
              "/.gitignore",
              "/README.md"
            ],
            icon: path.join(__dirname, 'assets/icons/app_icon'),
            osxSign: {
            identity: "Developer ID Application: Singularity Mods LLC (K3X44TCN7V)",
            "hardened-runtime": true,
            'gatekeeper-assess': false,
            "entitlements": "entitlements.plist",
            "entitlements-inherit": "entitlements.plist",
            "signature-flags": "library"
            },
            osxNotarize: {
            "appleId": "admin@singularitymods.com",
            "appleIdPassword": password,
            },
            appCopyright: "Copyright (C) 2020 Singularity Mods LLC"
        },
        beta: {
          asar: false,
          overwrite: true,
          "ignore": [
            "/bin/",
            "/obj/",
            "/out/",
            "/.git/",
            "/node_modules/",
            "/package-lock.json",
            "/entitlements.plist",
            "forge.config.js",
            "/tslint.json",
            "/.editorconfig",
            "/.gitignore",
            "/README.md"
          ],
          icon: path.join(__dirname, 'assets/icons/app_icon'),
          osxSign: {
          identity: "Developer ID Application: Singularity Mods LLC (K3X44TCN7V)",
          "hardened-runtime": true,
          'gatekeeper-assess': false,
          "entitlements": "entitlements.plist",
          "entitlements-inherit": "entitlements.plist",
          "signature-flags": "library"
          },
          osxNotarize: {
          "appleId": "admin@singularitymods.com",
          "appleIdPassword": password,
          },
          appCopyright: "Copyright (C) 2020 Singularity Mods LLC"
      },
        oss: {
            asar: true,
            overwrite: true,
            "ignore": [
              "/bin/",
              "/obj/",
              "/out/",
              "/.git/",
              "/node_modules/",
              "/package-lock.json",
              "/entitlements.plist",
              "forge.config.js",
              "/tslint.json",
              "/.editorconfig",
              "/.gitignore",
              "/README.md"
            ],
            icon: path.join(__dirname, 'assets/icons/app_icon'),
            appCopyright: "Copyright (C) 2020 Singularity Mods LLC"
        }
    }),
  makers: fromBuildIdentifier({
    prod:[
      {

        "name": "@electron-forge/maker-squirrel",
        "config": {
            "name": "Singularity",
            "setupExe":"Singularity-Setup.exe",
            "icon": path.join(__dirname, 'assets/icons/app_icon'),
            "setupIcon": path.join(__dirname, 'assets/icons/app_icon.ico'),
            "iconUrl": "https://storage.singularitycdn.com/icons/app/app_icon.ico",
            "loadingGif": path.join(__dirname, 'assets/gifs/loading.gif'),
            "remoteReleases": "https://storage.singularitycdn.com/App/Releases/Win/",
            "certificateFile": "SingularityWinDistribution.pfx",
            certificatePassword: process.env.SINGULARITY_CERT_PASSWORD,
            "rfc3161TimeStampServer": "http://timestamp.comodoca.com"
        }
      },
      {
        "name": '@electron-forge/maker-dmg',
        "config": {
          "name": "Singularity-Setup",
          "background": path.join(__dirname, 'assets/images/darwin-background.png'),
          "icon": path.join(__dirname, "assets/icons/app_icon.icns"),
          "overwrite": true
        }
      },
      {
        "name": "@electron-forge/maker-zip",
        "platforms": [
          "darwin"
        ]
      },
      {
        "name": "@electron-forge/maker-deb",
        "config": {}
      },
      {
        "name": "@electron-forge/maker-rpm",
        "config": {}
      }
    ],
    beta:[
      {

        "name": "@electron-forge/maker-squirrel",
        "config": {
            "name": "Singularity",
            "setupExe":"Singularity-Setup.exe",
            "icon": path.join(__dirname, 'assets/icons/app_icon'),
            "setupIcon": path.join(__dirname, 'assets/icons/app_icon.ico'),
            "iconUrl": "https://storage.singularitycdn.com/icons/app/app_icon.ico",
            "loadingGif": path.join(__dirname, 'assets/gifs/loading.gif'),
            "remoteReleases": "https://storage.singularitycdn.com/App/Releases/Win/Beta/",
            "certificateFile": "SingularityWinDistribution.pfx",
            certificatePassword: process.env.SINGULARITY_CERT_PASSWORD,
            "rfc3161TimeStampServer": "http://timestamp.comodoca.com"
        }
      },
      {
        "name": '@electron-forge/maker-dmg',
        "config": {
          "name": "Singularity-Setup",
          "background": path.join(__dirname, 'assets/images/darwin-background.png'),
          "icon": path.join(__dirname, "assets/icons/app_icon.icns"),
          "overwrite": true
        }
      },
      {
        "name": "@electron-forge/maker-zip",
        "platforms": [
          "darwin"
        ]
      },
      {
        "name": "@electron-forge/maker-deb",
        "config": {}
      },
      {
        "name": "@electron-forge/maker-rpm",
        "config": {}
      }
    ],
    oss: [
      {
        "name": "@electron-forge/maker-squirrel",
        "config": {
            "name": "Singularity",
            "setupExe":"Singularity-Setup.exe",
            "icon": path.join(__dirname, 'assets/icons/app_icon'),
            "setupIcon": path.join(__dirname, 'assets/icons/app_icon.ico'),
            "iconUrl": "https://storage.singularitycdn.com/icons/app/app_icon.ico",
            "loadingGif": path.join(__dirname, 'assets/gifs/loading.gif')
        }
      },
      {
        "name": '@electron-forge/maker-dmg',
        "config": {
          "name": "Singularity-Setup",
          "background": path.join(__dirname, 'assets/images/darwin-background.png'),
          "icon": path.join(__dirname, "assets/icons/app_icon.icns"),
          "overwrite": true
        }
      },
      {
        "name": "@electron-forge/maker-zip",
        "platforms": [
          "darwin"
        ]
      },
      {
        "name": "@electron-forge/maker-deb",
        "config": {}
      },
      {
        "name": "@electron-forge/maker-rpm",
        "config": {}
      }
    ],
  }),
  plugins: [
    ['@electron-forge/plugin-webpack', {
        mainConfig: path.resolve(__dirname, 'webpack.main.config.js'),
        renderer: {
          config: path.resolve(__dirname, 'webpack.renderer.config.js'),
          entryPoints: [{
              html: path.resolve(__dirname, 'src/windows/Main/index.html'),
              js: path.resolve(__dirname, 'src/windows/Main/renderer.jsx'),
              name: 'main_window',
          },
          {
            html: path.resolve(__dirname, 'src/windows/Splash/index.html'),
            js: path.resolve(__dirname, 'src/windows/Splash/renderer.jsx'),
            name: 'splash_window',
        }]
        }
    }]
  ],
};