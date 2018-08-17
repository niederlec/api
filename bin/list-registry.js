#!/usr/bin/env node

'use strict';

const
  {isExpiredOrInvalid} = require('../src/jwtToken'),
  fs                   = require('fs-extra'),
  _                    = require('lodash'),
  myColors             = require('../helpers/myColors')
;

const file = './.jwt/tokenRegistry.json';

fs.readJson(file)
  .then((registry) => {
    if (!_.isArrayLikeObject(registry)) throw new Error('No registry');
    const [invalidTokens, validTokens] = _.partition(registry, ({token}) => isExpiredOrInvalid(token));
    console.info('Invalid Tokens: '.bold.danger);
    console.dir(invalidTokens);
    console.info('Valid Tokens: '.bold.success);
    console.dir(validTokens);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
