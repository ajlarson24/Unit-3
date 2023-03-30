//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/NAmericaData.csv"),                    
                    d3.json("data/NAmerica.topojson")                  
                    ];    
    Promise.all(promises).then(callback);

    function callback(data){    
        csvData = data[0];    
        namerica = data[1];    
        console.log(csvData);
        console.log(namerica);

        //translate europe TopoJSON
        var namericaCountries = topojson.feature(namerica, namerica.objects.NAmerica)

        //examine the results
        console.log(namericaCountries);
    };
};