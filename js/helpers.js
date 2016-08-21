var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.helpers = {

    // Credit to Peter Chon for the client side OAuth code
    // My following client side OAuth implementation was based on his implementation.
    // His project and implementation can be found here:
    // http://peterchon.github.io/nanodegree-neighborhood-map-project/

    yelpAjaxRequest: function(api, parameters, callback) {

        var message = {
            'action': 'http://api.yelp.com/v2/' + api,
            'method': 'GET',
            'parameters': parameters
        };

        var accessor = {
            consumerSecret: neighborhoodApp.auth.consumerSecret,
            tokenSecret: neighborhoodApp.auth.accessTokenSecret
        };

        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);

        var data = OAuth.getParameterMap(message.parameters);

        this.ajaxRequest(message.action, data, "jsonp", callback);
    },

    ajaxRequest: function(url, data, dataType, callback) {

        //Cache true is needed for jsonp request in order to prevent underscore timestamp parameter
        //from being added automatically in the jquery request
        if (dataType == "jsonp") {
            $.ajax({
                'url': url,
                'data': data,
                'cache': true,
                'dataType': 'jsonp',
                'global': true,
                'jsonpCallback': 'cb',
                'success': function(data) {
                    callback(data);
                },
                'error': errorCallback
            });
        } else if (dataType == "json") {
            $.ajax({
                'url': url,
                'dataType': 'json',
                'success': function(data) {
                    callback(data);
                },
                'error': errorCallback
            });
        }
    },

    errorCallback: function(jqXHR, textStatus, errorThrown){
        alert("Request failed! Error: " errorThrown + "\n Status: " + textStatus)
    }

};