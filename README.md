# Ahgora Unofficial API

![](https://img.shields.io/badge/node-%3E=8-green.svg)

## Installation

```
$ npm install
```

## Usage

```
$ npm start
```

### Registering a punch

#### Registration only (using PhantomJS to simulate user interaction):

`POST /registration/register/:identity`

#### Registration and history checking (a comparison will be made on the returned punch array and the one recorded on history for that date):

`POST /registration/register/:identity?verify=true`

#### Direct registration:

`POST /registration/registerdirect/:identity`

Request body (application/json):

```
{
  "account": 0000,
  "password": "your_password",
  "identity": "your_company_id",
  "origin": "pw2",
  "key": ""
}
```

### Accessing the history

`GET /history/summary/:identity/:period`

You can access the history along with some information from the current week and day, regarding your work time. You just have to provide two parameters:

  - **identity**: the code of your company which was registered in the Ahgora service;
  - **period**: the desired period of the report in `MM-YYYY` format.

### Authentication

The requests are authenticated with HTTP Basic Auth and you just have to use your Ahgora credentials.
