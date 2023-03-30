//begin script when window loads
window.onload = setMap();

function setMap(){

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0, 45])
        .rotate([103, 0, 0])
        .parallels([29.5, 45.5])
        .scale(300)
        .translate([width / 2, height / 2]);
        
        var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];    
    promises.push(d3.csv("data/NAmericaData.csv")); //load attributes from csv       
    promises.push(d3.json("data/NAmerica.topojson")); //load choropleth spatial data    
    Promise.all(promises).then(callback);

    function callback(data){    
        //Example 2.6 line 1...create graticule generator
        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //Example 2.6 line 5...create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines

        csvData = data[0];    
        namerica = data[1];    
        console.log(csvData);
        console.log(namerica);

        //translate namerica TopoJSON
        var namericaCountries = topojson.feature(namerica, namerica.objects.NAmerica)
        var namerica = topojson.feature(namerica, namerica.objects.NAmerica)

        //add namerica countries to map
        var countries = map.append("path")
            .datum(namericaCountries)
            .attr("class", "countries")
            .attr("d", path);

        //add namerica regions to map
        var regions = map.selectAll(".regions")
            .data(namerica)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.SOVEREIGNT;
            })
            .attr("d", path);
            
    };
};