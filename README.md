[![DockerHub Badge](https://dockeri.co/image/conditor/api)](https://hub.docker.com/r/conditor/api/)

[![Build Status](https://travis-ci.org/conditor-project/api.svg?branch=master)](https://travis-ci.org/conditor-project/api)

# Conditor api
Main api of the conditor-project

- **[Installation](#installation)**
- **[Running the API](#running-the-api)**
- **[Querying the API](#querying-the-api)**
- **[Access rights](#access-rights)**
- **[Token Management](#token-management)**
- **[API Documentation](#api)**

## Description

The API's goal is to expose deduplicated bibliographical records of "conditor platform".

In order to be fully-functionnal, the API must be able to connect a Conditor Elasticsearch cluster.

## Under the hood

This API is coded in NodeJS with [ExpressJS](http://expressjs.com/) framework.

It can be run by different ways :

* Basically, with the `node` CLI
* Using [forever](https://github.com/foreverjs/forever), via the `npm run start-forever` command
* With docker, via the `make run-prod` command

Logs are managed with morgan, and written in the `$LOG_PATH/conditor-api.log` file

## Prerequisites

* Node v8+ / NPM5+ (tested with node 8.9.4)
* docker & docker-compose for Docker deployment

<a name="installation"></a>
## Installation

```bash
git clone https://github.com/conditor-project/api.git
cd api
make install # copy postgresql.conf.dist to postgresql.conf
```

For native node start or forever start :

```bash
npm install
```

For docker usage

```bash
make build
```
<a name="running-the-api"></a>
## Running the API

Before launchig the following commands, you MUST set `LOG_PATH`, `CONDITOR_ES_HOSTS` and `RECORD_INDEX` environments variables. For example :

```bash
export LOG_PATH="$HOME/var/log"
export CONDITOR_ES_HOSTS="localhost:9200"
export RECORD_INDEX="records"
```

You can also set other optional environment variables...

```bash
export CONDITOR_API_HOST="0.0.0.0"
export CONDITOR_API_PORT="63332"
export REVERSE_PROXY="~"
export JWT_KEY="Secret phrase for generating tokens"
export NODE_ENV="development|production"
```

... and other variables for PostGres and PGadmin

```bash
export PG_HOST="localhost"
export PG_PORT="5432"
export PG_USERNAME="conditor"
export PG_PASSWORD="conditor"
export PG_DATABASE="conditor"
export PG_DATADIR="./pgdata"
export PGADMIN_DEFAULT_EMAIL="pgadmin@mailbox.com"
export PGADMIN_DEFAULT_PASSWORD="pgadminpwd"
export PGADMIN_PORT="5432"
```

For native node start or forever start :

```bash
npm run start-forever
```

For development purpose

```bash
npm run dev
```

For docker deployment in production environment

```bash
make run-prod
```

For docker deployment in development/debugging environment

```bash
make run-debug
```

You can of course simultaneously set environment variables and start the API :

```bash
LOG_PATH="$HOME/var/log" \
CONDITOR_ES_HOSTS="localhost:9200" \
make run-prod
```

<a name="querying-the-api"></a>
## Querying the API

The official, production version, of the Conditor API, is (or will be soon) available at https://api.conditor.fr

All available URLs are listed and descripted on [this page](./doc/records.md).

<a name="access-rights"></a>
## Access rights

Access is restricted to authenticated and authorized users. Authentication is provided via a [JWT token](https://jwt.io/).

There are 2 ways to use your JWT token :

- Directly in your URL, via the `access_token` parameter (not very convenient)
- In the header of your HTTP request: `Authorization: Bearer <token>`

To obtain a token, contact the Conditor team, they will give you a 31 days valid one

<a name="token-management"></a>
## Token Management

Currently, 3 commands can help you for managing tokens :

### cleanup token registry

`npm run cleanup-registry`

Script available at [./bin/cleanup-registry.js](./bin/cleanup-registry.js)

### generate a new token

`npm run generate-token`

Generate a new JWT token, valid during 31 days

Script available at [./bin/generate-token.js](./bin/generate-token.js)

### list-registry

`npm run list-registry`

List all avalaible JWT tokens, with validity ranges.

Script available at [./bin/list-registry.js](./bin/list-registry.js)

<a name="api"></a>
## API Documentation

* [Références](doc/references.md)
* [Sécurité](doc/securite.md )
* [Records API](doc/records.md)
* [Agrégations](doc/aggregations.md)
* [Scroll API](doc/scroll.md)
* [Pagination](doc/pagin.md)
* [Tri des résultats](doc/sort.md)
* [Champs JSON](doc/recordFields.md)
* [Validation des nearDuplicates](doc/duplicatesValidations.md)
