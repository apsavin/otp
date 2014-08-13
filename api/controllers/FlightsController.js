/*global FlightsService*/

module.exports = {

    _config: { blueprints: { rest: false, actions: false } },

    /**
     * @param {IncomingMessage} req
     * @param {OutgoingMessage} res
     */
    index: function (req, res) {

        var company = req.param('company');

        /**
         * @const {number} count of hours
         */
        var SHIFT = 4;

        /**
         * @const {number} count of hours
         */
        var COMPANY_SHIFT = 12;

        FlightsService.getFlights(req.param('airport'), req.param('scheduleType'), company ? COMPANY_SHIFT : SHIFT)
            .then(function (result) {
                if (company && result.data) {
                    result.data = result.data.filter(function (row) {
                        return row.carrierFsCode === company;
                    });
                }
                res.json(result);
            })
            .fail(function (e) {
                res.send(500, e.stack || e.message);
            });
    }

};
