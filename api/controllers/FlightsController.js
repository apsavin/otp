/*global FlightsService*/

module.exports = {

    _config: { blueprints: { rest: false, actions: false } },

    index: function (req, res) {

        var company = req.param('company');

        FlightsService.getFlights(req.param('airport'), req.param('scheduleType'), company ? 12 : 4)
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
