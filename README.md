# Ahgora Unofficial API

![](https://img.shields.io/badge/node-%3E=9-green.svg)

An unofficial API to retrieve useful details from [Ahgora](https://ahgora.com.br) through data scraping.

## Installation

```
$ npm install
```

## Usage

### Starting the server

Start the server with `npm start`. The default port is 8080, but you can customize this with the `PORT` env variable. The default service URL can also be customized with the `SERVICE_URL` variable. Default values should work fine ;)

### Accessing the history

Endpoint: `/history/{{account}}/{{period}}`

You can access the history along with some information from the current week and day, regarding your work time. You just have to provide two parameters:

  - **account**: the code of your company which was registered in the Ahgora service;
  - **period**: the desired period of the report in `MM-YYYY` format.

The request is authenticated with HTTP Basic Auth and you just have to use your Ahgora credentials.
