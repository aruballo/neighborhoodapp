var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.model = {
	
	
};

neighborhoodApp.viewModel = {
	init: function(){
		this.inputView = ko.observable("dropdowns");
		this.dropdownsVisible = ko.observable(true);
		this.searchbarVisible = ko.observable(false);
		neighborhoodApp.mapView.init();
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