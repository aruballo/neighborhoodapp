var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.model = function(){
    var self = this;

    // Init takes in a callback function which will be called when
    // the ajax request is completed. This callback will be passed from
    // an async.series call.
    this.init = function(callback){
        self.fullCategoriesData;
        self.yelpResults;
        neighborhoodApp.helpers.ajaxRequest("js/yelpCategories.json", null, "json", function(data){
            self.fullCategoriesData = data
            self.loadParentandSubCategories();
            callback();
        });
    };

    // Create arrays for categories and subcategories
    this.loadParentandSubCategories = function(){
        self.parentCategories = [];
        self.subCategories = [];

        for(var i = 0; i < self.fullCategoriesData.length; i++){
            var currentObject = self.fullCategoriesData[i];
            if(currentObject.parents[0] === null){
                self.parentCategories.push(currentObject);
            }
            else{
                self.subCategories.push(currentObject);
            }
        }
    };

    // Filter the subcategory array by the parent parameter
    this.filterSubCategoriesByParent = function(parent){
        self.filteredSubCategories = [];

        for(var i = 0; i < self.subCategories.length; i++){
            var currentObject = self.subCategories[i];
            if(currentObject.parents[0] === parent){
                self.filteredSubCategories.push(currentObject);
            }
        }
    };

    // Add the needed parameters for a yelp api request to the passed
    // parameters' array
    this.setOAuthParameters = function(parameters){
        parameters.push(['callback', 'cb']);
        parameters.push(['oauth_consumer_key', neighborhoodApp.auth.consumerKey]);
        parameters.push(['oauth_consumer_secret', neighborhoodApp.auth.consumerSecret]);
        parameters.push(['oauth_token', neighborhoodApp.auth.accessToken]);
        parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
    };

    // Makes a Yelp Search API request
    this.loadYelpSearchResults = function(searchType, searchValue, location, radius, limit, callback){

        var parameters = [];

        // If this request was made from the dropdowns menu, grab the category and subcategory
        if(searchType == "dropdowns"){
            parameters.push(["category_filter", searchValue[0]]);
        }
        // Else just grab the searchbar value
        else{
            parameters.push(["term", searchValue[0]]);
        }

        parameters.push(['radius_filter', radius]);
        parameters.push(['location', location]);
        parameters.push(['limit', limit]);
        self.setOAuthParameters(parameters);

        neighborhoodApp.helpers.yelpAjaxRequest("search", parameters,
            function(data){
                self.saveYelpSearchResults(data, callback);
            }
        );
    };

    // Save Yelp Search API results
    this.saveYelpSearchResults = function(data, callback){
        self.yelpSearchResults = data;
        callback();
    };

    // Make a Yelp Business API request
    this.loadBusinessReviewForMarker = function(businessID, callback){

        var parameters = [];
        self.setOAuthParameters(parameters);

        neighborhoodApp.helpers.yelpAjaxRequest("business/" + businessID, parameters,
            function(data){
                callback(data);
            }
        );
    };
};

neighborhoodApp.viewModel = function(){
    var self = this;

    this.init = function(){


        self.inputView = ko.observable("dropdowns");
        self.dropdownsVisible = ko.observable(true);
        self.searchbarVisible = ko.observable(false);
        self.categories = ko.observableArray([]);
        self.subCategories = ko.observableArray([]);
        self.radiusList = ko.observableArray([{Miles: 5, Km: 8046}, {Miles: 10, Km: 16093}, {Miles: 15, Km: 24140}, {Miles: 20, Km: 32186}])
        self.selectedRadius = ko.observable('');
        self.selectedCategory = ko.observable('');
        self.selectedSubcategory = ko.observable('');
        self.searchValue = ko.observable('');
        self.resultsList = ko.observableArray([]);
        self.resultsLimit = 10;

        self.selectedCategory.subscribe(
            function(value){
                self.loadSubCategories(value);
            }
        );

        self.model = new neighborhoodApp.model();

        neighborhoodApp.mapView.init();

        // Series allows the functions in the array parameter
        // to execute in order. In this case, I want to make sure
        // the model has finished loading all its data before
        // the viewModel attempts to retrieve categories from it
        async.series([
            self.model.init,
            function(callback){
                self.loadCategories();
                callback();
            }
        ], function(){
            ko.applyBindings(self);
        });

    };

    // Switch between dropdowns or search bar
    this.toggleInputView = function(){
        if(self.inputView() == "dropdowns"){
            self.dropdownsVisible(true);
            self.searchbarVisible(false);
        }
        else{
            self.dropdownsVisible(false);
            self.searchbarVisible(true);
        }

        //By default, knockout will prevent the default action for the click event;
        //in this case its the checking of the radio button. Returning true allows the
        //default action to occur

        return true;
    };

    //Make yelp request based on search type
    this.loadYelpData = function(){
        var searchType = self.dropdownsVisible() ? "dropdowns" : "searchbar";
        var searchValues = [];

        if(searchType === "dropdowns"){
            searchValues.push(self.selectedSubcategory().alias);
        }
        else{
            searchValues.push(self.searchValue());
        }

        // The model should load the search results before
        // the viewModel attempts to display said results
        // on the map and list
        async.series([
            function(callback){
                self.model.loadYelpSearchResults(searchType, searchValues, "92614", self.selectedRadius(), self.resultsLimit, callback);
            },
            function(callback){
                self.loadMarkers();
                self.populateResultsList();
                callback();
            }
        ]);
    };

    this.loadCategories = function(){
        self.categories(self.model.parentCategories);
    };

    this.loadSubCategories = function(categoryObject){
        self.model.filterSubCategoriesByParent(categoryObject.alias);
        self.subCategories(self.model.filteredSubCategories);
    };

    this.populateResultsList = function(){
        self.resultsList.removeAll();
        for(var i = 0; i < self.model.yelpSearchResults.businesses.length; i++){
            self.resultsList.push(self.model.yelpSearchResults.businesses[i]);
        }
    };

    this.resultsListClick = function(index){
        google.maps.event.trigger(self.markersArray[index], 'click');
    };
    //  Populate map with markers based on search results retrieved
    //  and attach click event listeners to each marker to trigger
    //  a yelp business API ajax request
    this.loadMarkers = function(){
        self.clearMarkers();
        self.markersArray = [];
        for(var i = 0; i < self.model.yelpSearchResults.businesses.length; i++){
            var currentResult = self.model.yelpSearchResults.businesses[i];
            var lat = currentResult.location.coordinate.latitude;
            var lng = currentResult.location.coordinate.longitude;
            var title = currentResult.name;
            var id = currentResult.id;
            var resultLatlng = new google.maps.LatLng(lat, lng);
            var marker = new google.maps.Marker({
                position: resultLatlng,
                title: title
            });
            google.maps.event.addListener(marker, 'click',
            (function(marker, id){
                return function(){
                    self.model.loadBusinessReviewForMarker(id,
                        function(data){
                            self.createContentWindow(marker, data);
                        }
                    );
                };
            }(marker, id)));
            self.markersArray.push(marker);
            marker.setMap(neighborhoodApp.mapView.map);
        }

    };

    this.clearMarkers = function(){
        if(!self.markersArray){
            return;
        }
        else{
            for(var i = 0; i < self.markersArray.length; i++){
                self.markersArray[i].setMap(null);
            }

            self.markersArray = [];
        }
    };

    //Template for content windows that come up when a
    //marker is clicked.
    this.createContentWindow = function(marker, data){
        var contentString = '<div id="content">'+
            '<div style="float: left; margin-top: 10px; margin-right: 10px">'+
            '<img src="' + data.image_url + '"></img>' +
            '</div>'+
            '<div style="float: left">' +
            '<h1 id="firstHeading" style="margin-top: 0px">' + data.name + '</h1>'+
            '<img style="width: 84px, height: 17px, margin: 0px" src="' + data.rating_img_url + '"></img>' +
            '<p style="margin-top: 0px ">(' + data.review_count + ' reviews) </p>' +
            '</div>' +
            '<div id="bodyContent" style="clear: both">'+
            '<img style="height: 50px; width: 50px; float:left; margin-right: 10px" src="' + data.snippet_image_url + '"></img>' +
            '<h3>' + data.reviews[0].user.name + '</h3>' +
            '<img src="' + data.reviews[0].rating_image_small_url + '"> </img>' +
            '<p>' + data.snippet_text +
            '</p>' +
            '<a href="' + data.url + '" target="_blank"> Read more >>> </a>' +
            '</div>'+

            '</div>';


        var infowindow = new google.maps.InfoWindow({
            content: contentString,
            maxWidth: 400
        });

        infowindow.open(neighborhoodApp.mapView.map, marker);

    };
};

neighborhoodApp.mapView = {
    init: function(){
        // Attempt to use the geolocation api to determine positon
        var self = this;
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(
                function(position){
                    self.showMap(position);
                },
                function(){
                    self.showMap(null);
                },
                {
                    timeout: 3000
                }
            );
        }
        else{
            this.showMap(null);
        }
    },

    //If null is passed it simply defaults to my home coordinates
    showMap: function(position){
        var latitude;
        var longitude;
        if(position){
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
        }
        else{
           latitude = 33.679046;
           longitude = -117.833076;
        }

        neighborhoodApp.mapView.mapOptions = {
            center: { lat: latitude, lng: longitude},
            zoom: 12
        };
        neighborhoodApp.mapView.map = new google.maps.Map(document.getElementById('map-canvas'), neighborhoodApp.mapView.mapOptions);

        var resultLatlng = new google.maps.LatLng(latitude, longitude);
        var marker = new google.maps.Marker({
            position: resultLatlng,
            title: "Calculated Location"
        });

        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png')
        marker.setMap(neighborhoodApp.mapView.map);
    }
};

neighborhoodApp.currentViewModel = new neighborhoodApp.viewModel();
neighborhoodApp.currentViewModel.init();