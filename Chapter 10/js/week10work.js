//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function () {

    //pseudo-global variables
    var attrArray = ["2023_Population", "vGDP_PrCap", "Area_Mi", "vPop_Dens", "Life_Exp"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //begin script when window loads
    window.onload = setMap();

    function setMap(){

        //map frame dimensions
        var width = 960,
            height = 750;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAzimuthalEqualArea()
            //.scale(width / 2.8 / Math.PI)
            //.zoom()
            .scale(500)
            .rotate([100,-50])
            .center([0,0])
            .translate([width / 2, height / 2])

        var path = d3.geoPath().projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [
            d3.csv("data/NAmericaData.csv"), //load attributes from csv
            d3.json("data/WorldCountries.topojson"), //load basemap data       
            d3.json("data/NAmerica.topojson"), //load choropleth spatial data
        ];
        Promise.all(promises).then(callback);

            function callback(data) {
                var csvData = data[0], world = data[1], namerica = data[2];

                setGraticule(map, path);

                //translate namerica TopoJSON
                var worldCountries = topojson.feature(world, world.objects.WorldCountries),
                    namericaCountries = topojson.feature(namerica, namerica.objects.NAmerica).features;
            
                //add all countries to map
                var world = map
                    .append("path")
                    .datum(worldCountries)
                    .attr("class", "world")
                    .attr("d", path);
                
                namericaCountries = joinData(namericaCountries, csvData);

                setEnumerationUnits(namericaCountries,map,path);
            };
    };


        function setGraticule(map,path){
            //Example 2.6 line 1...create graticule generator
            var graticule = d3.geoGraticule().step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

            //create graticule background
            var gratBackground = map
                .append("path")
                .datum(graticule.outline()) //bind graticule background
                .attr("class", "gratBackground") //assign class for styling
                .attr("d", path) //project graticule

            //Example 2.6 line 5...create graticule lines
            var gratLines = map
                .selectAll(".gratLines") //select graticule elements that will be created
                .data(graticule.lines()) //bind graticule lines to each element to be created
                .enter() //create an element for each datum
                .append("path") //append each element to the svg as a path element
                .attr("class", "gratLines") //assign class for styling
                .attr("d", path); //project graticule lines            
        }

        function joinData(namericaCountries,csvData){
            for (var i = 0; i < csvData.length; i++) {
                var csvRegion = csvData[i]; //the current region
                var csvKey = csvRegion.SOVEREIGNT; //the CSV primary key

                //loop through geojson regions to find correct region
                for (var a = 0; a < namericaCountries.length; a++) {

                    var geojsonProps = namericaCountries[a].properties; //the current region geojson properties
                    var geojsonKey = geojsonProps.SOVEREIGNT; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey) {

                        //assign all attributes and values
                        attrArray.forEach(function (attr) {
                            var val = parseFloat(csvRegion[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
            };
            return namericaCountries;
        }
        
        function setEnumerationUnits(namericaCountries,map,path){
            //add namerica regions to map
            var namerica = map
                .selectAll(".namericaCountries")
                .data(namericaCountries)
                .enter()
                .append("path")
                .attr("class", function (d) {
                    return "namericaCountries " + d.properties.SOVEREIGNT;
                })
                .attr("d", path);
        }

})(); //last line of main.js