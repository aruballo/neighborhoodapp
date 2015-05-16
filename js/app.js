var neighborhoodApp = neighborhoodApp || {};

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
		
		neighborhoodApp.helpers.yelpAjaxRequest(searchType, searchValue, location, radius, 
			(function(callback){
				var cb = callback;
				return function(data){
					self.saveYelpResults(data, cb);
				}
			})(callback)
		);
	};
	
	this.saveYelpResults = function(data, callback){
		self.yelpResults = data;
		callback();
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
			searchValues.push(self.selectedCategory().alias);
			searchValues.push(self.selectedSubcategory().alias);
		}
		else{
			searchValues.push('ice cream');
		}
		
		async.series([
			function(callback){
				self.model.loadYelpResults(searchType, searchValues, "92614", self.selectedRadius(), callback);
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
		console.log(self.model.yelpResults);
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