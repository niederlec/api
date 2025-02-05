'use strict';

const
  Buffer              = require('buffer').Buffer,
  {main: esClient}    = require('../../helpers/clients/elastic').startAll().get(),
  {indices}           = require('config-component').get(module),
  esResultFormat      = require('../../helpers/esResultFormat'),
  _                   = require('lodash'),
  ScrollStream        = require('elasticsearch-scroll-stream'),
  queryStringToParams = require('../queryStringToParams'),
  {buildRequestBody}  = require('../documentQueryBuilder')
;

const recordsManager = module.exports;

const
  defaultParams = {
    index     : indices.records.index,
    type      : indices.records.type,
    filterPath: ['hits.hits',
                 'hits.hits._source',
                 'hits.hits._score',
                 'hits.hits.sort',
                 'hits.total',
                 '_scroll_id',
                 'aggregations']
  }
;

// RecordsManager API
recordsManager.getSingleHitByIdConditor = getSingleHitByIdConditor;
recordsManager.getSingleTeiByIdConditor = getSingleTeiByIdConditor;
recordsManager.search = search;
recordsManager.searchByIdConditors = searchByIdConditors;
recordsManager.filterByCriteria = filterByCriteria;
recordsManager.getScrollStreamFilterByCriteria = getScrollStreamFilterByCriteria;
recordsManager.getDuplicatesByIdConditor = getDuplicatesByIdConditor;
recordsManager.getNearDuplicatesByIdConditor = getNearDuplicatesByIdConditor;



getScrollStreamFilterByCriteria.options = ['includes', 'excludes', 'q', 'limit', 'sort'];
function getScrollStreamFilterByCriteria (filterCriteria = {}, {q, sort, limit, ...options} = {}) {
  return Promise
    .resolve()
    .then(() => {
      const
        requestBody = buildRequestBody(q, null, filterCriteria, sort)
      ;

      const params =
              _.defaultsDeep(
                {
                  body: requestBody.toJSON(),
                  size: 500
                },
                queryStringToParams(options),
                defaultParams
              );

      // idConditor is mandatory
      if (params._sourceIncludes) {
        params._sourceIncludes.push('idConditor');
      }
      if (params._sourceExcludes) {
        _.pull(params._sourceExcludes, 'idConditor');
      }

      const scrollStream = new ScrollStream(esClient,
                                            params,
                                            ['_score'],
                                            {objectMode: true}
      );


      if (limit) {
        let recordsCount = 0;
        limit = scrollStream._resultCount = _.toSafeInteger(limit);
        scrollStream
          .on('data', () => {
            ++recordsCount;
            if (recordsCount > limit) {
              scrollStream.close();
              scrollStream._isClosed = true;
            }
          });
      }

      return scrollStream
        .on('error', (err) => {
          if (['TypeError'].includes(err.name)) {err.status = 400;}
        });
    });
}

filterByCriteria.options = ['scroll', 'includes', 'excludes', 'page', 'page_size', 'q', 'aggs', 'sort'];
function filterByCriteria (filterCriteria, {q, aggs, sort, ...options} = {}) {
  return Promise
    .resolve()
    .then(() => {
      const
        requestBody = buildRequestBody(q, aggs, filterCriteria, sort)
      ;

      const params =
              _.defaultsDeep(
                {'body': requestBody.toJSON()},
                queryStringToParams(options),
                defaultParams);

      const paginate = _.curryRight(esResultFormat.paginate, 3)(params.size)(params.from);

      return esClient
        .search(params)
        .catch(_clientErrorHandler)
        .then(esResultFormat.getResult)
        .then(paginate)
        ;
    });
}

getSingleHitByIdConditor.options = ['includes', 'excludes', 'aggs'];
function getSingleHitByIdConditor (idConditor, {aggs, ...options} = {}) {
  return Promise
    .resolve()
    .then(() => {
      const
        requestBody = buildRequestBody(null, aggs, {idConditor})
      ;

      const params = _.defaultsDeep({
                                      body: requestBody.toJSON(),
                                      size: 2 // If hits count =/= 1 then an error is thrown
                                    },
                                    queryStringToParams(options),
                                    defaultParams
      );

      return esClient
        .search(params)
        .catch(_clientErrorHandler)
        .then(esResultFormat.getSingleResult)
        ;
    });
}

getSingleTeiByIdConditor.options = [];
function getSingleTeiByIdConditor (idConditor, options = {}) {

  return Promise
    .resolve()
    .then(() => {
      const
        requestBody = buildRequestBody(null, null, {idConditor})
      ;

      const params =
              _.defaultsDeep({
                               body           : requestBody.toJSON(),
                               size           : 2, // If hits count =/= 1 then an error is thrown
                               _sourceIncludes: 'teiBlob'
                             },
                             queryStringToParams(options),
                             defaultParams
              )
      ;

      return esClient
        .search(params)
        .catch(_clientErrorHandler)
        .then(esResultFormat.getSingleScalarResult)
        .then(({result, ...rest}) => {
          result = Buffer.from(result, 'base64');
          return _.assign({result}, rest);
        });
    });
}

searchByIdConditors.options = ['scroll', 'includes', 'excludes', 'page', 'page_size', 'aggs', 'sort'];
function searchByIdConditors (idConditors, options = {}) {
  options.q = `"idConditor:(${idConditors.join(' OR ')})"`;
  return search(options);
}

search.options = ['scroll', 'includes', 'excludes', 'page', 'page_size', 'q', 'aggs', 'sort'];
function search ({q, aggs, sort, ...options}) {

  return Promise
    .resolve()
    .then(() => {
      const
        requestBody = buildRequestBody(q, aggs, null, sort)
      ;

      const params = _.defaultsDeep(
        {body: requestBody.toJSON()},
        queryStringToParams(options),
        defaultParams
      );
      const paginate = _.curryRight(esResultFormat.paginate, 3)(params.size)(params.from);

      return esClient
        .search(params)
        .catch(_clientErrorHandler)
        .then(esResultFormat.getResult)
        .then(paginate)
        ;
    });
}

getDuplicatesByIdConditor.options = ['includes', 'excludes', 'aggs', 'page', 'page_size', 'q', 'sort'];
function getDuplicatesByIdConditor (idConditor, {q, aggs, sort, ...options} = {}, flag = '') {
  const AND_SELF = 'and_self';

  return Promise
    .resolve()
    .then(() => {
      const
        requestBody = buildRequestBody(null, null, {idConditor})
      ;
      const params = _.defaultsDeep({
                                      body: requestBody.toJSON(),
                                      size: 2 // If hits count =/= 1 then an error is thrown
                                    },
                                    queryStringToParams({includes: 'duplicates.idConditor'}),
                                    defaultParams
      );

      return esClient
        .search(params)
        .catch(_clientErrorHandler)
        .then(esResultFormat.getSingleResult)
        .then((result) => {
          const idConditors = _.chain(result)
                               .get('result.duplicates', [])
                               .transform((accu, duplicate) => {
                                 accu.push(_.get(duplicate, 'idConditor', ''));
                               })
                               .value()
          ;

          if (flag === AND_SELF) idConditors.push(idConditor);

          const
            requestBody = buildRequestBody(q, aggs, {idConditor: idConditors}, sort)
          ;
          const params = _.defaultsDeep({
                                          body: requestBody.toJSON()
                                        },
                                        queryStringToParams(options),
                                        defaultParams
          );
          const paginate = _.curryRight(esResultFormat.paginate, 3)(params.size || idConditors.length)(params.from);

          return esClient
            .search(params)
            .catch(_clientErrorHandler)
            .then(esResultFormat.getResult)
            .then(paginate)
            .then((result) => {
              if (!q && result.totalCount < idConditors.length) {
                result.addWarning({
                                    code: 199,
                                    text: `Expected nested duplicates total is ${idConditors.length} for record ${idConditor}, but got ${result.totalCount}`
                                  });
              }
              return result;
            })
            ;
        })
        ;
    });
}


getNearDuplicatesByIdConditor.options = ['includes', 'excludes', 'aggs', 'page', 'page_size', 'q', 'sort'];
function getNearDuplicatesByIdConditor (idConditor, {q, aggs, sort, ...options} = {}, flag = '') {
  const AND_SELF = 'and_self';

  return Promise
    .resolve()
    .then(() => {
      const
        requestBody = buildRequestBody(null, null, {idConditor})
      ;
      const params = _.defaultsDeep({
                                      body: requestBody.toJSON(),
                                      size: 2 // If hits count =/= 1 then an error is thrown
                                    },
                                    queryStringToParams({includes: 'nearDuplicates.idConditor'}),
                                    defaultParams
      );

      return esClient
        .search(params)
        .catch(_clientErrorHandler)
        .then(esResultFormat.getSingleResult)
        .then((result) => {
          const idConditors = _.chain(result)
                               .get('result.nearDuplicates', [])
                               .transform((accu, duplicate) => {
                                 accu.push(_.get(duplicate, 'idConditor', ''));
                               })
                               .value()
          ;

          if (flag === AND_SELF) idConditors.push(idConditor);

          const
            requestBody = buildRequestBody(q, aggs, {idConditor: idConditors}, sort)
          ;
          const params = _.defaultsDeep({
                                          body: requestBody.toJSON()
                                        },
                                        queryStringToParams(options),
                                        defaultParams
          );
          const paginate = _.curryRight(esResultFormat.paginate, 3)(params.size || idConditors.length)(params.from);

          return esClient
            .search(params)
            .catch(_clientErrorHandler)
            .then(esResultFormat.getResult)
            .then(paginate)
            .then((result) => {
              if (!q && result.totalCount < idConditors.length) {
                result.addWarning({
                                    code: 199,
                                    text: `Expected nested nearDuplicates total is ${idConditors.length} for record ${idConditor}, but got ${result.totalCount}`
                                  });
              }
              return result;
            })
            ;
        })
        ;
    });
}


function _clientErrorHandler (err) {
  if (['TypeError'].includes(err.name)) {err.status = 400;}
  throw err;
}
