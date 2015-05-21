var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.model = function(){
	var self = this;
	
	//Init takes in a callback function which will be called when 
	//the ajax request is completed. This callback will be passed from
	//an async.series call. 
	this.init = function(callback){
		self.fullCategoriesData;
		self.yelpResults;
		neighborhoodApp.helpers.ajaxRequest("js/yelpCategories.json", null, "json", function(data){
			self.fullCategoriesData = data
			self.loadParentandSubCategories();
			callback();	
		});
	};
	
	
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
	
	this.filterSubCategoriesByParent = function(parent){
		self.filteredSubCategories = [];
		
		for(var i = 0; i < self.subCategories.length; i++){
			var currentObject = self.subCategories[i];
			if(currentObject.parents[0] === parent){
				self.filteredSubCategories.push(currentObject);
			}
		}
	};
	
	this.setOAuthParameters = function(parameters){
		parameters.push(['callback', 'cb']);
		parameters.push(['oauth_consumer_key', neighborhoodApp.auth.consumerKey]);
		parameters.push(['oauth_consumer_secret', neighborhoodApp.auth.consumerSecret]);
		parameters.push(['oauth_token', neighborhoodApp.auth.accessToken]);
		parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
	};
	
	this.loadYelpSearchResults = function(searchType, searchValue, location, radius, callback){
			
		var parameters = [];

		//If this request was made from the dropdowns menu, grab the category and subcategory
		if(searchType == "dropdowns"){
			parameters.push(["category_filter", searchValue[0]]);
		}
		//Else just grab the searchbar value
		else{
			parameters.push(["term", searchValue[0]]);
		}	

		parameters.push(['radius_filter', radius]);
		parameters.push(['location', location]);
		self.setOAuthParameters(parameters);
		
		neighborhoodApp.helpers.yelpAjaxRequest("search", parameters, 
			function(data){
				self.saveYelpSearchResults(data, callback);
			}
		);
	};
	
	this.saveYelpSearchResults = function(data, callback){
		self.yelpSearchResults = data;
		callback();
	};
	
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
		self.radiusList = ko.observableArray([8046, 16093, 24140, 32186])
		self.selectedRadius = ko.observable('');
		self.selectedCategory = ko.observable('');
		self.selectedSubcategory = ko.observable('');
		
		self.selectedCategory.subscribe( 
			function(value){
				self.loadSubCategories(value);
			}
		);
		
		self.model = new neighborhoodApp.model();
		
		neighborhoodApp.mapView.init();
		
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
	
	this.loadYelpData = function(){
		var searchType = self.dropdownsVisible() ? "dropdowns" : "searchbar";
		var searchValues = [];
		
		if(searchType === "dropdowns"){
			searchValues.push(self.selectedSubcategory().alias);
		}
		else{
			searchValues.push('ice cream');
		}
		
		async.series([
			function(callback){
				self.model.loadYelpSearchResults(searchType, searchValues, "92614", self.selectedRadius(), callback);
			},
			function(callback){
				self.loadMarkers();
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
	
	this.loadMarkers = function(){
		self.clearMarkers();
		self.markersArray = [];
		for(var i = 0; i < self.model.yelpSearchResults.total; i++){
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
	
	this.createContentWindow = function(marker, data){
		var contentString = '<div id="content">'+
			'<div id="siteNotice">'+
			'</div>'+
			'<h1 id="firstHeading" class="firstHeading">' + data.name + '</h1>'+
			'<div id="bodyContent">'+
			'<p>' + data.snippet_text + 
			'</p>' +
			'</div>'+
			'</div>';
		
		
		var infowindow = new google.maps.InfoWindow({
			content: contentString
		});
		
		infowindow.open(neighborhoodApp.mapView.map, marker);

	};
};

neighborhoodApp.mapView = {
	init: function(){
		this.mapOptions = {
			center: { lat: 33.679046, lng: -117.833076},
			zoom: 12
		};
	    this.map = new google.maps.Map(document.getElementById('map-canvas'), this.mapOptions);
	}
};

neighborhoodApp.currentViewModel = new neighborhoodApp.viewModel();
neighborhoodApp.currentViewModel.init();