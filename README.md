# video2desmos

Use this npm package to turn any video into a "desmos slideshow"

## Setup

### Install _nodejs_, _npm_ and _ffmpeg_

```sh
sudo apt update
sudo apt install nodejs npm ffmpeg -y
```

### Install node packages

```sh
npm i
```

## Usage

Put _in.mp4_ in this folder, then run:

```sh
npm run-script setup
```

Then when you want to run the server run:

```sh
npm start
```

(The first run will be **very** slow)

Before you use another mp4 file you should run:

```sh
npm run-script clear
```
