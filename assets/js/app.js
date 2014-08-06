$(function () {
    var $form = $('form').ajaxForm({
        success: function (response) {
            if (response.ready) {
                render($form[0].scheduleType[0].checked, response.data);
            } else {
                setTimeout(function () {
                    $form.submit();
                }, 2000)
            }
        },
        error: function () {
            alert('Error!');
        }
    });
});

function render (departing, data) {
    var airportFsCodeKey,
        dateKey,
        whenKey,
        gateKey;
    if (departing) {
        airportFsCodeKey = 'arrivalAirportFsCode';
        dateKey = 'departureDate';
        whenKey = 'actualRunwayDeparture';
        gateKey = 'departureGate';
    } else {
        airportFsCodeKey = 'departureAirportFsCode';
        dateKey = 'arrivalDate';
        whenKey = 'actualRunwayArrival';
        gateKey = 'arrivalGate';
    }
    $('#results').html(data.length ? (
        '<table border="1">' +
            '<thead>' +
            (departing ? '<th>To</th>' : '<th>From</th>') +
            '<th>Flight</th><th>When (Scheduled / Actual)</th><th>Gate</th><th>Status</th>' +
            '</thead>' +
            '<tbody>' +
            data.map(function (flight) {
                return '<tr>' +
                    '<td>' + flight[airportFsCodeKey] + '</td>' +
                    '<td>' + flight.flightNumber + (flight.codeshares ?
                    (' (codeshares: ' + flight.codeshares.map(function (codeshare) {
                        return codeshare.flightNumber;
                    }).join(', ') + ')') : '') + '</td>' +
                    '<td>' + prepareTime(flight[dateKey].dateLocal) + ' / ' +
                    (flight.operationalTimes[whenKey] ? prepareTime(flight.operationalTimes[whenKey].dateLocal) : '-') + '</td>' +
                    '<td>' + (flight.airportResources && flight.airportResources[gateKey] ? flight.airportResources[gateKey] : '-') + '</td>' +
                    '<td>' + flight.status + '</td>' +
                    '</tr>'
            }).join('') +
            '</tbody>' +
            '</table>') : 'No flights.'
    );
}

function prepareTime (dateTimeString) {
    return dateTimeString.split('T')[1].split('.')[0];
}
