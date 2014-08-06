var Vow = require('vow');

module.exports = {
    attributes: {
        airport: 'STRING',
        scheduleType: 'STRING',
        year: 'STRING',
        month: 'STRING',
        date: 'STRING',
        hour: 'STRING',
        cached: 'BOOLEAN',
        scheduled: 'BOOLEAN'
    },

    /**
     * @param query
     * @param sort
     * @param doc
     * @param [options]
     * @param [callback]
     */
    findAndModify: function (query, sort, doc, options, callback) {
        callback = callback || (typeof options === 'function' ? options : undefined);
        var args = Array.apply(null, arguments);
        if (callback) {
            args.pop();
        }
        var deferred = Vow.defer(),
            newCallback = function (err, data) {
                if (data && data._id) {
                    data.id = data._id;
                    delete data.id;
                }
                if (callback) {
                    callback(err, data);
                }
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(data);
                }
            };
        args.push(newCallback);
        this.native(function (err, collection) {
            if (err) {
                return newCallback(err);
            }
            collection.findAndModify.apply(collection, args);
        });
        return deferred.promise();
    }
};
