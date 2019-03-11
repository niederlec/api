#!/usr/bin/env node

'use strict';

const fs                 = require('fs-extra'),
      {generate, verify} = require('../src/jwtToken'),
      myColors           = require('../helpers/myColors')
;
const file = './.jwt/tokenRegistry.json';

const token = generate(),
      entry = _buildRegistration(token)
;

fs.readJson(file)
  .then((registry) => {
    registry.push(entry);
    return registry;
  })
  .catch((err) => {
    if (err.code === 'ENOENT') {
      return [entry];
    }
    console.error(err);
    process.exit(1);
  })
  .then((json) => {
    fs.outputJson(file, json, {spaces: 2})
      .then(() => {
        console.info('Jwt token generated'.bold.success);
        console.dir(entry);
      });
  });

function _buildRegistration (token) {
  const decoded = verify(token);

  return {
    token,
    creation  : (new Date(decoded.iat * 1000)).toLocaleString(),
    expiration: (new Date(decoded.exp * 1000)).toLocaleString(),
    subject   : decoded.sub,
    jwtid     : decoded.jti
  };
}
