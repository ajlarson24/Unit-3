//Top of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    var attrArray = ["2023_Population", "GDP_PrCap", "Area_Mi", "Pop_Dens", "Life_Exp"]; //list of attributes
    var expressed = attrArray[1]; //initial attribute
    
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 110]);
    
    //begin script when window loads
    window.onload = setMap();

    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 700;

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
            .center([0,-5])
            .translate([width / 2, height / 2])

        var path = d3.geoPath().projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [
            d3.csv("data/NAmericaData.csv"), //load attributes from csv
            d3.json("data/WorldCountries.topojson"), //load basemap data       
            d3.json("data/NAmericaNew.topojson"), //load choropleth spatial data
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

            //create the color scale
            var colorScale = makeColorScale(csvData);

            setEnumerationUnits(namericaCountries,  map,  path, colorScale)

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            createDropdown(csvData);
        };
    };  //end of setMap()

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
            var csvKey = csvRegion.JoinID; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < namericaCountries.length; a++) {

                var geojsonProps = namericaCountries[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.JoinID; //the geojson primary key

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

    //function to create color scale generator
    function makeColorScale(data) {
        var colorClasses = [
            "#f1eef6",
            "#bdc9e1",
            "#74a9cf",
            "#2b8cbe",
            "#045a8d"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };
        
function setEnumerationUnits(namericaCountries,map,path, colorScale){
    //add France regions to map
    var regions = map.selectAll(".country")
        .data(namericaCountries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "country " + d.properties.JoinID;
        })
        .attr("d", path)
        .style("fill", function(d){            
            var value = d.properties[expressed];            
            if(value) {                
                return colorScale(value);            
            } else {                
                return "#ccc";            
            }       
         })
        .on("mouseover", function(event, d){
            highlight(d.properties);
        })
        .on("mouseout", function(event, d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

    var desc = regions.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');
}

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create a text element for the chart title
    var chartTitle = chart
        .append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle");

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 100]);

    //in setChart()...set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.JoinID;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", function(event, d){
            highlight(d);
        })
        .on("mouseout", function(event, d){
            dehighlight(d);
        })
        .on("mousemove", moveLabel);

    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);
}; //end of setChart()

//Example 1.1 line 1...function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//Example 1.4 line 14...dropdown change event handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //Example 1.5 line 9...recolor enumeration units
    var regions = d3.selectAll(".country")
        .transition()
        .duration(1000)
        .style("fill", function(d){            
            var value = d.properties[expressed];            
            if(value) {                
                return colorScale(value);           
            } else {                
                return "#ccc";            
            }    
    });

    //Example 1.7 line 22...Sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //Sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

    updateChart(bars, csvData.length, colorScale);
}; //end of changeAttribute()

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){            
            var value = d[expressed];            
            if(value) {                
                return colorScale(value);            
            } else {                
                return "#ccc";            
            }    
    });

    //at the bottom of updateChart()...add text to chart title
    var chartTitle = d3.select(".chartTitle")
        .text(expressed + " in each region");

};

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.JoinID)
        .style("stroke", "orange")
        .style("stroke-width", "2");

    setLabel(props)
};

//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.JoinID)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props.SOVEREIGNT + "</h1><h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.SOVEREIGNT + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};

//function to move info label with mouse
//Example 2.8 line 1...function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth - 10,
        y2 = event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

})(); //last line of main.js