var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.view = {
	init: function(){
		var mapOptions = {
			center: { lat: 33.679046, lng: -117.833076},
			zoom: 12
		};
	    var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	}
};

neighborhoodApp.view.init();