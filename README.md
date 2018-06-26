# Ahgora Unofficial API

![](https://img.shields.io/badge/node-%3E=8-green.svg)

An unofficial API to retrieve useful details from [Ahgora](https://ahgora.com.br) through data scraping.

## Installation

```
$ npm install
```

## Usage

```
$ npm start
```

### Registering a punch

`POST /registration/register/:identity`

### Accessing the history

`GET /history/summary/:identity/:period`

You can access the history along with some information from the current week and day, regarding your work time. You just have to provide two parameters:

  - **identity**: the code of your company which was registered in the Ahgora service;
  - **period**: the desired period of the report in `MM-YYYY` format.

### Authentication

The requests are authenticated with HTTP Basic Auth and you just have to use your Ahgora credentials.
