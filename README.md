<p align="center">
  <img src="https://storage.singularitycdn.com/App/Images/logo.png" height="200" width="646"/>
</p>

[![Singularity Discord](https://img.shields.io/static/v1?label=Discord&message=Singularity&color=7289DA)](https://discord.gg/xNcqjUD) 
[![Singularity Patreon](https://img.shields.io/static/v1?label=Patreon&message=Singularity&color=f96854)](https://www.patreon.com/xorro) 

# Singularity Addon Manager

Singularity is the single app for your addon management. We created Singularity because privacy is important and how other people treat your privacy matters.

## Build Singularity

Singularity was built and tested on Node v12 though other versions may work.

Clone this repository locally :

```bash
git clone https://github.com/singularitymods/singularity-core.git
```

If on Windows, install required build tools as an administrator
```bash
npm install --global node-gyp
npm install --global --production windows-build-tools
```

Install dependencies with npm :

```bash
npm install
```

### Start a development build

To start a development build of Singularity, use the following command:

```bash
npm start
```

### Build a standalone copy of Singularity

To package a copy of Singularity on MacOS, use the following command:

```bash
npm run package
```

This creates an unsigned .app file in out/oss/Singularity-darwin-x64. Simply move this to your Applications directory and you're ready to run!

On Windows, use the following command to create an unsigned executable:

```bash
npm run make
```