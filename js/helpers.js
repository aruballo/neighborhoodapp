var neighborhoodApp = neighborhoodApp || {};

neighborhoodApp.helpers = {
	
	// Credit to Peter Chon for the client side OAuth code
	// My following client side implementation was based on his implementation.
	// His project and implementation can be found here:
	// http://peterchon.github.io/nanodegree-neighborhood-map-project/
	
	yelpAjaxRequest: function(searchType, searchValue, location, radius, callback){
		
		//In a production implementation of a project like this
		//the secrets would not be exposed. But this is simply for 
		//proof of concept. 	
		var auth = {
			    consumerKey : "zsEyc2ob02LLz9ikcHa2mg",
			    consumerSecret : "NUCrcURCNp0rEmeTxrLzyv4QtLI",
			    accessToken : "SaDgd7ammC57wzZfr2MXFeBEFWq5rIRv",
			    accessTokenSecret : "OShl-Sj67dhdQXsJble_kMmchWM"
		};
	
	
		var accessor = {
			consumerSecret : auth.consumerSecret,
			tokenSecret : auth.accessTokenSecret
		};
		
		var parameters = [];
		
		//If this request was made from the dropdowns menu, grab the category and subcategory
		if(searchType == "dropdowns"){
			parameters.push(["category_filter", searchValue[0] + (searchValue[1] ? "," + searchValue[1] : "") ]);
		}
		//Else just grab the searchbar value
		else{
			parameters.push(["term", searchValue[0]]);
		}
		
		parameters.push(['location', location]);
		parameters.push(['callback', 'cb']);
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

		var data = OAuth.getParameterMap(message.parameters);
		
		this.ajaxRequest(message.action, data , "jsonp", callback);
	},
	
	ajaxRequest: function(url, data, dataType, callback){
		if(dataType == "jsonp"){
			$.ajax({
				'url' : url,
				'data' : data,
				//needed to prevent jquery timestamp parameter from
				//being added to request
				'cache': true,
				'dataType' : 'jsonp',
				'global' : true,
				'jsonpCallback' : 'cb',
				'success' : function(data){
					callback(data);
				}
			});
		}
	}
	
};