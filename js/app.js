'use strict';

var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.model = function() {
    var self = this;

    this.init = function() {
        self.fullCategoriesData;
        self.yelpResults;
        self.fullCategoriesData = neighborhoodApp.yelpCategories;
        self.loadParentandSubCategories();
        self.locationMarker = new google.maps.Marker({});
    };

    // Create arrays for categories and subcategories
    this.loadParentandSubCategories = function() {
        var categoriesDataLength = self.fullCategoriesData.length
        self.parentCategories = [];
        self.subCategories = [];

        for (var i = 0; i < categoriesDataLength; i++) {
            var currentObject = self.fullCategoriesData[i];
            if (currentObject.parents[0] === null) {
                self.parentCategories.push(currentObject);
            } else {
                self.subCategories.push(currentObject);
            }
        }
    };

    // Filter the subcategory array by the parent parameter
    this.filterSubCategoriesByParent = function(parent) {
        self.filteredSubCategories = [];

        for (var i = 0; i < self.subCategories.length; i++) {
            var currentObject = self.subCategories[i];
            if (currentObject.parents[0] === parent) {
                self.filteredSubCategories.push(currentObject);
            }
        }
    };

    // Add the needed parameters for a yelp api request to the passed
    // parameters' array
    this.setOAuthParameters = function(parameters) {
        parameters.push(['callback', 'cb']);
        parameters.push(['oauth_consumer_key', neighborhoodApp.auth.consumerKey]);
        parameters.push(['oauth_consumer_secret', neighborhoodApp.auth.consumerSecret]);
        parameters.push(['oauth_token', neighborhoodApp.auth.accessToken]);
        parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
    };

    // Makes a Yelp Search API request
    this.loadYelpSearchResults = function(searchType, searchValue, radius, limit, callback) {

        var parameters = [];

        // If this request was made from the dropdowns menu, grab the category and subcategory
        if (searchType == "dropdowns") {
            parameters.push(["category_filter", searchValue[0]]);
        }
        // Else just grab the searchbar value
        else {
            parameters.push(["term", searchValue[0]]);
        }

        if (self.locationMarker.position) {
            var position = self.locationMarker.position;
            var lat = position.lat();
            var lng = position.lng();
        } else {
            var lat = 33.679046;
            var lng = -117.833076;
        }

        parameters.push(['radius_filter', radius]);
        parameters.push(['ll', lat + ',' + lng]);
        parameters.push(['limit', limit]);
        self.setOAuthParameters(parameters);

        neighborhoodApp.helpers.yelpAjaxRequest("search", parameters,
            function(data) {
                self.saveYelpSearchResults(data, callback);
            }
        );
    };

    // Save Yelp Search API results
    this.saveYelpSearchResults = function(data, callback) {
        self.yelpSearchResults = data;
        callback();
    };

    // Make a Yelp Business API request
    this.loadBusinessReviewForMarker = function(businessID, callback) {

        var parameters = [];
        self.setOAuthParameters(parameters);

        neighborhoodApp.helpers.yelpAjaxRequest("business/" + businessID, parameters,
            function(data) {
                callback(data);
            }
        );
    };

    // Get LatLng for location marker
    this.loadLocationCoordinates = function(address, callback) {
        var geocoder = geocoder = new google.maps.Geocoder();
        geocoder.geocode({
                'address': address
            },
            function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    self.locationMarker = new google.maps.Marker({
                        map: neighborhoodApp.mapView.map,
                        position: results[0].geometry.location
                    });
                    self.locationMarker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
                    callback();
                } else {
                    alert("Geocode was not successful for the following reason: " + status);
                }
            })
    };
};

neighborhoodApp.viewModel = function() {
    var self = this;

    this.init = function() {


        self.inputView = ko.observable("dropdowns");
        self.dropdownsVisible = ko.observable(true);
        self.searchbarVisible = ko.observable(false);
        self.manualLocationVisible = ko.observable(false);
        self.categories = ko.observableArray([]);
        self.subCategories = ko.observableArray([]);
        self.toggleFiltersVisible = ko.observable(false);
        self.radiusList = ko.observableArray([{
            Miles: 5,
            Km: 8046
        }, {
            Miles: 10,
            Km: 16093
        }, {
            Miles: 15,
            Km: 24140
        }, {
            Miles: 20,
            Km: 32186
        }]);
        self.selectedRadius = ko.observable('');
        self.selectedCategory = ko.observable('');
        self.selectedSubcategory = ko.observable('');
        self.searchValue = ko.observable('');
        self.manualLocationValue = ko.observable('');
        self.resultsList = ko.observableArray([]);
        self.resultsLimit = 10;
        self.filterResultsInput = ko.observable('');
        self.selectedCategory.subscribe(
            function(value) {
                self.loadSubCategories(value);
            }
        );
        self.filterResultsInput.subscribe(
            function(value) {
                self.filterResults(value);
            }
        );
        self.model = new neighborhoodApp.model();
        self.infoWindow = new google.maps.InfoWindow;

        neighborhoodApp.mapView.init();

        self.model.init();
        self.loadCategories();
        ko.applyBindings(self);
        self.loadYelpData();
    };

    // Switch between dropdowns or search bar
    this.toggleInputView = function() {
        if (self.inputView() == "dropdowns") {
            self.dropdownsVisible(true);
            self.searchbarVisible(false);
        } else {
            self.dropdownsVisible(false);
            self.searchbarVisible(true);
        }

        //By default, knockout will prevent the default action for the click event;
        //in this case its the checking of the radio button. Returning true allows the
        //default action to occur

        return true;
    };

    this.toggleFilters = function() {
        if (self.toggleFiltersVisible() == false){
            self.toggleFiltersVisible(true);
        }
        else{
            self.toggleFiltersVisible(false);
        }
    };

    //Make yelp request based on search type
    this.loadYelpData = function() {
        var searchType = self.dropdownsVisible() ? "dropdowns" : "searchbar";
        var searchValues = [];

        if (searchType === "dropdowns") {
            searchValues.push(self.selectedSubcategory().alias);
        } else {
            searchValues.push(self.searchValue());
        }

        // The model should load the search results before
        // the viewModel attempts to display said results
        // on the map and list
        async.series([
            function(callback) {
                self.model.loadYelpSearchResults(searchType, searchValues, self.selectedRadius(), self.resultsLimit, callback);
            },
            function(callback) {
                self.loadMarkers();
                self.populateResultsList();
                callback();
            }
        ]);
    };

    this.loadCategories = function() {
        self.categories(self.model.parentCategories);
    };

    this.loadSubCategories = function(categoryObject) {
        self.model.filterSubCategoriesByParent(categoryObject.alias);
        self.subCategories(self.model.filteredSubCategories);
    };

    this.populateResultsList = function() {
        self.resultsList.removeAll();
        for (var i = 0; i < self.model.yelpSearchResults.businesses.length; i++) {
            self.resultsList.push(self.model.yelpSearchResults.businesses[i]);
        }
    };

    this.resultsListClick = function(index) {
        google.maps.event.trigger(self.markersArray[index], 'click');
    };
    //  Populate map with markers based on search results retrieved
    //  and attach click event listeners to each marker to trigger
    //  a yelp business API ajax request
    this.loadMarkers = function() {
        self.clearMarkers();
        self.markersArray = [];
        for (var i = 0; i < self.model.yelpSearchResults.businesses.length; i++) {
            var currentResult = self.model.yelpSearchResults.businesses[i];
            var lat = currentResult.location.coordinate.latitude;
            var lng = currentResult.location.coordinate.longitude;
            var title = currentResult.name;
            var id = currentResult.id;
            var resultLatlng = new google.maps.LatLng(lat, lng);
            var marker = new google.maps.Marker({
                position: resultLatlng,
                title: title,
                animation: google.maps.Animation.DROP
            });
            google.maps.event.addListener(marker, 'click',
                (function(marker, id) {
                    return function() {
                        marker.setAnimation(google.maps.Animation.BOUNCE);
                        self.model.loadBusinessReviewForMarker(id,
                            function(data) {
                                self.createContentWindow(marker, data);
                            }
                        );
                    };
                }(marker, id)));
            self.markersArray.push(marker);
            marker.setMap(neighborhoodApp.mapView.map);
        }
    };

    this.locationOption = function(type) {
        if (type === "manual") {
            self.manualLocationVisible(true);
            $("#modal").toggleClass("modalDisplay");
        } else if (type === "detect") {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        var latitude;
                        var longitude;
                        if (position) {
                            latitude = position.coords.latitude;
                            longitude = position.coords.longitude;
                        } else {
                            latitude = 33.679046;
                            longitude = -117.833076;
                        }

                        self.model.locationMarker.setMap(null);

                        var resultLatlng = new google.maps.LatLng(latitude, longitude);
                        self.model.locationMarker = new google.maps.Marker({
                            position: resultLatlng,
                            title: "Calculated Location"
                        });
                        self.model.locationMarker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
                        self.model.locationMarker.setMap(neighborhoodApp.mapView.map);
                        neighborhoodApp.mapView.map.setCenter(self.model.locationMarker.position);
                    },
                    function() {
                        alert("Unable to retrieve location");
                    }, {
                        timeout: 3000
                    }
                );
            }
        }
    }

    this.loadManualLocation = function() {
        if (arguments[1].target.id == "cancelManualLocation") {
            self.manualLocationVisible(false);
            $("#modal").toggleClass("modalDisplay");
            return;
        }
        async.series([
            function(callback) {
                self.model.loadLocationCoordinates(self.manualLocationValue(), callback);
                if (self.model.locationMarker.setMap) {
                    self.model.locationMarker.setMap(null);
                }
            },
            function(callback) {
                self.manualLocationVisible(false);
                self.model.locationMarker.setMap(neighborhoodApp.mapView.map);
                neighborhoodApp.mapView.map.setCenter(self.model.locationMarker.position);
                $("#modal").toggleClass("modalDisplay");
            }
        ]);
    }

    this.clearMarkers = function() {
        if (!self.markersArray) {
            return;
        } else {
            for (var i = 0; i < self.markersArray.length; i++) {
                self.markersArray[i].setMap(null);
            }

            self.markersArray = [];
        }
    };

    //Template for content windows that come up when a
    //marker is clicked.
    this.createContentWindow = function(marker, data) {
        if(data){
            var imageurl = data.image_url ? data.image_url  : "images/placeholder.png";

            var contentString = '<div id="infoWindow">' +
                '<div id="infoWindowImageDiv">' +
                '<img class="infoWindowImage" src="' + imageurl+ '"></img>' +
                '</div>' +
                '<div id="infoWindowLocationTitle">' +
                '<h1 id="infoWindowHeading">' + data.name + '</h1>' +
                '<img id="infoWindowRatingImage" src="' + data.rating_img_url + '"></img>' +
                '<p id="infowWindowReviewCount">(' + data.review_count + ' reviews) </p>' +
                '</div>' +
                '<div id="infoWindowContent">' +
                '<img id="infoWindowReviewerImage" src="' + data.snippet_image_url + '"></img>' +
                '<h3>' + data.reviews[0].user.name + '</h3>' +
                '<img src="' + data.reviews[0].rating_image_small_url + '"> </img>' +
                '<p>' + data.snippet_text +
                '</p>' +
                '<a href="' + data.url + '" target="_blank"> Read more >>> </a>' +
                '</div>' +

                '</div>';
        }
        else{
            var contentString = '<div id="infoWindow">' +
                '<div id="infoWindowImageDiv">' +
                '<img src="images/placehold.png"></img>' +
                '</div>' +
                '<div id="infoWindowLocationTitle">' +
                '<h1 id="infoWindowHeading">Not Available</h1>' +
                '<img id="infoWindowRatingImage" src=""></img>' +
                '<p id="infowWindowReviewCount">( 0 reviews) </p>' +
                '</div>' +
                '<div id="infoWindowContent">' +
                '<img id="infoWindowReviewerImage" src=""></img>' +
                '<h3>No data returned</h3>' +
                '<img src=""> </img>' +
                '</div>' +
                '</div>';
        }

        self.infoWindow.setContent(contentString);
        google.maps.event.addListener(self.infoWindow,'closeclick', (function(marker){
            return function(){
                if(marker.getAnimation() !== null){
                    marker.setAnimation(null);
                }
            }
        }(marker)));
        self.infoWindow.open(neighborhoodApp.mapView.map, marker);
        neighborhoodApp.mapView.map.setCenter(marker.position);
    };

    this.filterResults = function(value) {
        var length = self.resultsList().length;
        var result = '';
        for(var i = 0; i < length; i++){
            result = self.resultsList()[i];
            if(result.name.toLowerCase().indexOf(value.toLowerCase()) < 0 && value !== ""){
                result._destroy = true;
                self.markersArray[i].setVisible(false);
            }
            else{
                result._destroy = false;
                self.markersArray[i].setVisible(true);
            }
        }
        self.refreshResultsList();
    };

    this.refreshResultsList = function(){
        var data = self.resultsList().slice(0);
        self.resultsList([]);
        self.resultsList(data);
    };
};

neighborhoodApp.mapView = {
    init: function() {
        var self = this;
        self.showMap();
    },

    //If null is passed it simply defaults to my home coordinates
    showMap: function(position) {
        var latitude = 33.679046;
        var longitude = -117.833076;
        var styledMap = new google.maps.StyledMapType(neighborhoodApp.mapStyle, {
            name: 'Styled Map'
        });

        neighborhoodApp.mapView.mapOptions = {
            center: {
                lat: latitude,
                lng: longitude
            },
            zoom: 12
        };
        neighborhoodApp.mapView.map = new google.maps.Map(document.getElementById('map-canvas'), neighborhoodApp.mapView.mapOptions);
        neighborhoodApp.mapView.map.mapTypes.set('map_style', styledMap);
        neighborhoodApp.mapView.map.setMapTypeId('map_style');
    }
};

neighborhoodApp.googleMapsCallback = function() {
    neighborhoodApp.currentViewModel = new neighborhoodApp.viewModel();
    neighborhoodApp.currentViewModel.init();
}

neighborhoodApp.googleMapsErrorCallback = function(){
    alert("An error has occurred while trying to load Google Maps; please check the console for more information");
}