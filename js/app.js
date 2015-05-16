var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.helpers = {
	
	getQueryStringParameters: function(searchType, searchValue, location, radius, callback){
		// Credit to Peter Chon for the client side OAuth code
		// His source is here:
		// http://peterchon.github.io/nanodegree-neighborhood-map-project/

		var auth = {
			    consumerKey : "zsEyc2ob02LLz9ikcHa2mg",
			    consumerSecret : "NUCrcURCNp0rEmeTxrLzyv4QtLI",
			    accessToken : "SaDgd7ammC57wzZfr2MXFeBEFWq5rIRv",
			    accessTokenSecret : "OShl-Sj67dhdQXsJble_kMmchWM",
			    serviceProvider : {
			        signatureMethod : "hmac-sha1"
			    }
		};
	
	
		var accessor = {
			consumerSecret : auth.consumerSecret,
			tokenSecret : auth.accessTokenSecret
		};
		
		var parameters = [];
		if(searchType == "dropdowns"){
			parameters.push(["category_filter", searchValue[0] + (searchValue[1] ? "," + searchValue[1] : "") ]);
		}
		else{
			parameters.push(["term", searchValue[0]]);
		}
		
		parameters.push(['location', location]);
		parameters.push(['callback', callback]);
		parameters.push(['radius_filter', radius]);
		parameters.push(['oauth_consumer_key', auth.consumerKey]);
		parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
		parameters.push(['oauth_token', auth.accessToken]);
		parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
	

		var message = {
			'action' : 'http://api.yelp.com/v2/search',
			'method' : 'GET',
			'parameters' : parameters
		};
	

		OAuth.setTimestampAndNonce(message);
		OAuth.SignatureMethod.sign(message, accessor);

	
		var queryParameters = OAuth.getParameterMap(message.parameters);
		var query = "category_filter=" + queryParameters.category_filter + 
			"&location=" + queryParameters.location + 
			"&radius_filter=" + queryParameters.radius_filter +
		    "&oauth_consumer_key=" + queryParameters.oauth_consumer_key +
			"&oauth_consumer_secret=" + queryParameters.oauth_consumer_secret +
			"&oauth_token=" + queryParameters.oauth_token +
			"&oauth_nonce=" + queryParameters.oauth_nonce +
			"&oauth_signature=" + queryParameters.oauth_signature +
			"&oauth_signature_method=" + queryParameters.oauth_signature_method +
			"&oauth_timestamp=" + queryParameters.oauth_timestamp;
			
		return query;
	}
	
};

neighborhoodApp.model = function(){
	var self = this;
	
	//Init takes in a callback function which will be called when 
	//the ajax request is completed. This callback will be passed from
	//an async.series call. 
	this.init = function(callback){
		self.fullCategoriesData;
		self.yelpResults;
		
		var request = neighborhoodApp.getxmlhttpObject();
		request.open("GET", "js/yelpCategories.json", true);
		request.send(null);
		request.onreadystatechange = function() {
			if ( request.readyState === 4 && request.status === 200) {
				if(request.responseText){
					self.fullCategoriesData = JSON.parse(request.responseText);
					self.loadParentandSubCategories();
					callback();
				}
			}			
		};	

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
	
	this.loadYelpResults = function(searchType, searchValue, location, radius, callback){
		
		var query = neighborhoodApp.helpers.getQueryStringParameters(searchType, searchValue, location, radius, callback);
		var script = document.createElement('script');
		script.src = 'http://api.yelp.com/v2/search?' + query;
		document.body.appendChild(script);
		//script.parentNode.removeChild(script);
	};
	
	this.saveYelpResults = function(data){
		self.yelpResults = JSON.parse(data);
		console.log(self.yelpResults);
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
		self.radiusList = ko.observableArray([5, 10, 20, 25])
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
	
	this.loadMarkers = function(){
		var searchType = self.dropdownsVisible() ? "dropdowns" : "searchbar";
		var searchValues = [];
		
		if(searchType === "dropdowns"){
			searchValues.push(self.selectedCategory().alias);
			searchValues.push(self.selectedSubcategory().alias);
		}
		else{
			searchValues.push('ice cream');
		}
		
		self.model.loadYelpResults(searchType, searchValues, "92614", self.selectedRadius(), "neighborhoodApp.viewModel.outputyelpdata");
	};
	
	this.loadCategories = function(){
		self.categories(self.model.parentCategories);
	};
	
	this.loadSubCategories = function(categoryObject){
		self.model.filterSubCategoriesByParent(categoryObject.alias);
		self.subCategories(self.model.filteredSubCategories);
	};
	
	this.outputyelpdata = function(data){
		console.log(data);
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