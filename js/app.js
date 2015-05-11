var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.model = {
	
	
};

neighborhoodApp.viewModel = {
	
	
};

neighborhoodApp.view = {
	init: function(){
		this.mapOptions = {
			center: { lat: 33.679046, lng: -117.833076},
			zoom: 12
		};
	    this.map = new google.maps.Map(document.getElementById('map-canvas'), this.mapOptions);
	}
};

neighborhoodApp.view.init();