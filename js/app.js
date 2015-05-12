var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.model = {
	init: function(){
		var self = this;
		this.fullCategoriesData;
		
		var request = neighborhoodApp.getxmlhttpObject();
		request.open("GET", "js/yelpCategories.json", true);
		request.send(null);
		request.onreadystatechange = function() {
			if ( request.readyState === 4 && request.status === 200) {
				if(request.responseText){
					self.fullCategoriesData = JSON.parse(request.responseText);
					self.loadParentandSubCategories();
				}
			}			
		};	

	},
	loadParentandSubCategories: function(){
		this.parentCategories = [];
		this.subCategories = [];
		
		for(var i = 0; i < this.fullCategoriesData.length; i++){
			var currentObject = this.fullCategoriesData[i];
			if(currentObject.parents[0] === "null"){
				this.parentCategories.push(currentObject);
			}
			else{
				this.subCategories.push(currentObject);
			}
		}
	},
};

neighborhoodApp.viewModel = {
	init: function(){
		var self = this;
		
		this.inputView = ko.observable("dropdowns");
		this.dropdownsVisible = ko.observable(true);
		this.searchbarVisible = ko.observable(false);
		this.categories;
		
		neighborhoodApp.mapView.init();
		neighborhoodApp.model.init();
			
	},
	toggleInputView: function(){
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
	},
	loadMarkers: function(){
		
	},
	loadCategories: function(){
		this.categories = ko.observableArray(neighborhoodApp.model.parentCategories);
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

neighborhoodApp.viewModel.init();
ko.applyBindings(neighborhoodApp.viewModel);