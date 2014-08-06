/*global FlightsRequest*/

var Vow = require('vow'),
    moment = require('moment'),
    queryProps = [
        'airport', 'scheduleType', 'year', 'month', 'date', 'hour'
    ],
    request = require('request');

/**
 * @typedef {Object} FlightQuery
 * @property {String} airport
 * @property {String} scheduleType
 * @property {String} year
 * @property {String} month
 * @property {String} date
 */

module.exports = {

    /**
     * @param {string} airport
     * @param {string} scheduleType
     * @param {number} shift
     */
    getFlights: function (airport, scheduleType, shift) {
        return this._getFlightsRequests(this._createQueries(airport, scheduleType, shift))
            .then(this._processFlightsRequests, this);
    },

    /**
     * @param {string} airport
     * @param {string} scheduleType
     * @param {number} shift
     * @return {Array.<FlightQuery>}
     * @private
     */
    _createQueries: function (airport, scheduleType, shift) {
        var date = moment(),
            ids = [];
        date.subtract(shift, 'h');
        for (var i = -shift; i <= shift; i++) {
            ids.push(this._createQuery(airport, scheduleType, date));
            date.add(1, 'h');
        }
        return ids;
    },

    /**
     * @param {String} airport
     * @param {String} scheduleType
     * @param {Moment} date
     * @returns {FlightQuery}
     * @private
     */
    _createQuery: function (airport, scheduleType, date) {
        return {
            airport: airport, scheduleType: scheduleType,
            year: date.year(), month: date.month(), date: date.date(), hour: date.hour()
        };
    },

    /**
     * @param {Array.<FlightQuery>} queries
     * @private
     */
    _cloneQueries: function (queries) {
        return queries.map(this._cloneObject);
    },

    /**
     * @param {FlightQuery} query
     * @returns {FlightQuery}
     * @private
     */
    _cloneObject: function (query) {
        var copy = {};
        for (var key in query) {
            if (query.hasOwnProperty(key)) {
                copy[key] = query[key];
            }
        }
        return copy
    },

    /**
     * @param {Array.<FlightQuery>} queries
     * @returns {vow:Promise}
     * @private
     */
    _getFlightsRequests: function (queries) {
        return Vow.resolve(FlightsRequest.find({or: this._cloneQueries(queries)})).then(function (savedQueries) {
            if (savedQueries.length === queries.length) {
                return savedQueries;
            } else if (!savedQueries.length) {
                return Vow.all(queries.map(this._getFlightsRequest, this));
            } else {
                var flightRequests = this._getNotSavedQueries(queries, savedQueries)
                    .map(this._getFlightsRequest, this);
                return Vow.all(flightRequests)
                    .then(function (queries) {
                        return savedQueries.concat(queries);
                    });
            }
        }, this);
    },

    /**
     * @param {Array.<FlightQuery>} queries
     * @param {Array.<FlightQuery>} savedQueries
     * @returns {Array.<FlightQuery>}
     * @private
     */
    _getNotSavedQueries: function (queries, savedQueries) {
        savedQueries = savedQueries.slice(0);
        return queries.filter(function (query) {
            return !savedQueries.some(function (savedQuery, i, savedQueries) {
                var saved = queryProps.every(function (prop) {
                    return savedQuery[prop] === query[prop];
                });
                if (saved) {
                    savedQueries.splice(i, 1);
                }
                return saved;
            });
        });
    },

    /**
     * @param {FlightQuery} query
     * @returns {vow:Promise}
     * @private
     */
    _getFlightsRequest: function (query) {
        return FlightsRequest.findAndModify(query, [], {
            $setOnInsert: {cached: false, scheduled: false}
        }, {
            w: 1, upsert: true, new: true
        });
    },

    /**
     * @param {Array.<FlightQuery>} docs
     * @private
     */
    _processFlightsRequests: function (docs) {
        var unCachedRequests = docs.filter(function (doc) {
            return !doc.cached;
        });
        if (!unCachedRequests.length) {
            return {ready: true, data: docs.reduce(function (result, doc) {
                return result.concat(doc.result);
            }, [])};
        }
        var unScheduledRequests = unCachedRequests.filter(function (request) {
            return !request.scheduled;
        });
        if (!unScheduledRequests.length) {
            return {ready: false};
        }
        return this._sendRequests(unScheduledRequests).then(function () {
            return {ready: false};
        });
    },

    /**
     * @param docs
     * @returns {vow:Promise}
     * @private
     */
    _sendRequests: function (docs) {
        return Vow.all(docs.map(function (doc) {
            this._sendRequest(doc);
            return FlightsRequest.update({id: doc._id}, {scheduled: true});
        }, this));
    },

    /**
     * @param doc
     * @private
     */
    _sendRequest: function (doc) {
        request('https://api.flightstats.com/flex/flightstatus/rest/v2/json/airport/status/' +
            doc.airport +
            '/' + (doc.scheduleType === 'departing' ? 'dep' : 'arr') +
            '/' + doc.year + '/' + (doc.month + 1) + '/' + doc.date + '/' + doc.hour +
            '?appId=c4247eb0&appKey=' + process.env.OTP_APP_KEY + 
            '&utc=false&numHours=1&codeType=IATA', function (err, res, body) {
            var update;
            if (!err && body) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    err = e;
                    console.log(body);
                    body = null;
                }
            }
            if (!err && body && body.error) {
                err = body.error;
            }
            if (err) {
                sails.log.error(err);
                update = FlightsRequest.update({id: doc._id}, {scheduled: false});
            } else {
                update = FlightsRequest.update({id: doc._id}, {cached: true, result: body.flightStatuses});
            }
            update.exec(function (err) {
                if (err) {
                    sails.log.error(err);
                }
            })
        });
    }

};
