var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.model = function(){
	var self = this;
	
	//Init takes in a callback function which will be called when 
	//the ajax request is completed. This callback will be passed from
	//an async.series call. 
	this.init = function(callback){
		self.fullCategoriesData;
	
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
};

neighborhoodApp.viewModel = function(){
	var self = this;
	
	this.init = function(){
		this.inputView = ko.observable("dropdowns");
		this.dropdownsVisible = ko.observable(true);
		this.searchbarVisible = ko.observable(false);
		this.categories;
		this.model = new neighborhoodApp.model();
		
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
		if(this.inputView() == "dropdowns"){
			this.dropdownsVisible(true);
			this.searchbarVisible(false);
		}
		else{
			this.dropdownsVisible(false);
			this.searchbarVisible(true);
		}
		//By default, knockout will prevent the default action for the click event;
		//in this case its the checking of the radio button. Returning true allows the
		//default action to occur
		return true;	
	};
	
	this.loadMarkers = function(){
		
	};
	
	this.loadCategories = function(){
		this.categories = ko.observableArray(self.model.parentCategories);
	}
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