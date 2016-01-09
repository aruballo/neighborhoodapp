# Neighborhood App
Neighborhood Application for Udacity Course. This application requests your location and allows you to search for interesting locations near you. It presents this information on a large interactive map.

## How to use
Users can select a category and a subcategory from the first 2 dropdowns in the dropdown mode, and select a distance (in miles) from their current location. Users can also switch into "Search Bar" mode to simply search by keywords. A green marker will mark the users current location (or the default location if geolocation is not enabled); red markers will mark matching results. Clicking on the red markers will bring up a content window with the location title, the latest Yelp review and Yelp rating, as well as a link to the Yelp listing.

## Technologies used
This application makes use of Google Maps. The Google Maps API is documented here:     
[Google Maps API](https://developers.google.com/maps/?hl=en)

The locations are retrieved using the Yelp API. That API can be found here:          
[Yelp API](https://www.yelp.com/developers/documentation/v2/overview)

Makes use of Async.js:     
[Async.js](https://github.com/caolan/async)

For MV*, this application makes use of Knockout.js:     
[Knockout.js](http://knockoutjs.com/)

Makes use of jQuery for AJAX requests:     
[jQuery](https://jquery.com/)

Google map theme located here:     
[Papuportal Dark](https://snazzymaps.com/style/20053/papuportal-dark)
## Issues 
In Firefox if you deny the geolocation request, the error callback never fires and the map never loads. See bug here:
https://bugzilla.mozilla.org/show_bug.cgi?id=675533
