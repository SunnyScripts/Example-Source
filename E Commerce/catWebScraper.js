/**
 * Created by Ryan Berg on 12/29/16.
 * rberg2@hotmail.com
 */

String.prototype.catFormat = function()
{
    this.replace(/(--\d|-)$/, "");
    this.replace(/-/g, " ");

    var wordsList = this.match(/\w+/g);
    var newString = "";

    for(var i = 0; i < wordsList.length; i++)
    {
        var space = " ";
        if(i == wordsList.length-1)
            space = "";
        newString += wordsList[i].charAt(0).toUpperCase() + wordsList[i].slice(1) + space;
    }
    return newString;
};
function logTimestamp(){
    var date = new Date(Date.now());
    date.setUTCFullYear(date.getFullYear());
    date.setUTCMonth(date.getMonth());
    date.setUTCDate(date.getDate());
    date.setUTCHours(date.getHours());
    date.setUTCMinutes(date.getMinutes());
    date.setUTCSeconds(date.getSeconds());
    console.log(date.toLocaleString());
}

var fileSystem = require('fs');
var page = require('webpage').create();

// page.settings.userAgent = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E)';
// page.viewportSize =
//     {
//         width: 1280,
//         height: 1024
//     };
page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36';
page.viewportSize =
    {
        width: 1440,
        height: 900
    };

var urlPathJSON = fileSystem.read("partsURLPathList.json");
urlPathJSON = JSON.parse(urlPathJSON);
var saveData = fileSystem.read("save_state.json");
if(saveData && saveData != "")
{
    urlPathJSON = JSON.parse(saveData);
}
var pathsArray = [];
var categoryArray = [];

for(var _category in urlPathJSON)
{
    categoryArray.push(_category);
}
var category = categoryArray.pop();

for(var _path in urlPathJSON[category])
{
    pathsArray.push(urlPathJSON[category][_path]);
}

var path;

// var list = JSON.parse(fileSystem.read("saved_primary_scrape_data.json"));
//
// secondaryScrapeConstructor(list);

queryConstructor();

// primaryScrape("https://parts.cat.com/en/catcorp/water-pump#facet:&productBeginIndex:0&orderBy:&pageView:grid&minPrice:&maxPrice:&pageSize:&", secondaryScrapeConstructor);
// function writeToLog(array)
// {
//     console.log(JSON.stringify(array));
// }
// secondaryScrapeConstructor([{"id":"335425","name":": PUMP WATER","part_number":"100-4952","price":"","weight":"","category":"shop-supplies","subcategory":"COOLING SYSTEM COMPONENTS"}]);

function queryConstructor()
{
    console.log("PRIMARY SCRAPE START");

    //Save the current place in the url list
    var saveState = {};
    for(var i = 0; i < categoryArray.length; i++)
    {
        saveState[categoryArray[i]] = urlPathJSON[categoryArray[i]];
    }
    saveState[category] = pathsArray;
    fileSystem.write("save_state.json", JSON.stringify(saveState), "w");

    if(pathsArray.length != 0)
    {
        path = pathsArray.pop();

        primaryScrape("https://parts.cat.com/en/ncmachinery/"+path, handlePagination);
    }
    else
    {
        if(categoryArray.length != 0)
        {
            category = categoryArray.pop();
            for(var _path in urlPathJSON[category])
            {
                pathsArray.push(urlPathJSON[category][_path]);
            }
            return queryConstructor();
        }
        else
        {
            phantom.exit();
        }
    }
}

function handlePagination(wholePartsList, numberOfParts, baseURL)
{
    if(!wholePartsList)
    {
        return queryConstructor();
    }
    var remainingPages = 1;// Math.ceil(numberOfParts/12);

    console.log("handle pagination\ntotal number of pages "+remainingPages+"\nbase url "+baseURL);


    (function primaryScrapeManager(partialPartsList)
    {
       remainingPages--;
       if(partialPartsList)
       {
           wholePartsList = wholePartsList.concat(partialPartsList);
       }
       console.log("number of remaining pages "+ remainingPages);

       fileSystem.write("saved_primary_scrape_data.json", JSON.stringify(wholePartsList), "w");

        if(remainingPages != 0)
       {
           var waitTime = Math.floor((Math.random()*10+3)*10);

           console.log("primary scrape wait time: " + waitTime + "seconds");
           logTimestamp();
           setTimeout(primaryScrape, waitTime*1000, baseURL+"?ddkey=https%3AClickInfo#facet:&productBeginIndex:"+remainingPages*12+"&orderBy:&pageView:grid&minPrice:&maxPrice:&pageSize:&", primaryScrapeManager);
       }
       else
       {
           // console.log("whole parts list\n"+JSON.stringify(wholePartsList));
           secondaryScrapeConstructor(wholePartsList);
       }
    })()
}

function primaryScrape(url, callback)
{
    page.close();
    //TODO create page function that picks weighted random settings and matching viewport
    page = require('webpage').create();

    // page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36';
    // page.viewportSize = {width: 1440, height: 900};
    page.settings.userAgent = "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36";
    page.viewportSize = {width: 1280, height: 1024};

    console.log("attempting to open URL " +url);
    page.open(url, function(status)
    {
        console.log('Page Status:\n' + status);

        if(status === "success")
        {
            console.log("lazy load started");
            setTimeout(function ()
            {
                var evaluationResults = page.evaluate(function()
                {
                    console.log("evaluating...");
                    var partsArray = [];

                    var productsList = document.getElementsByClassName("grid_mode grid")[0];
                    if(!productsList)
                    {
                        return partsArray;
                    }

                    productsList = productsList.getElementsByTagName('LI');

                    for(var i = 0; i < productsList.length; i++)
                    {
                        var productID = (productsList[i].firstElementChild.id).match(/\d+/)[0];
                        // console.log("product ID: "+ productID + "\niteration step: "+i);

                        var productNumber = document.getElementById("desc_"+productID).innerText.replace(/-PRODUCT/, "");

                        var productDescription = document.getElementById('name_'+productID).innerText;
                        var productName = productDescription.replace(/(\d|\w){1,3}-\d{4}(:|)( |)/, "");

                        var price = document.getElementById('ajax_undiscountedAmount_'+productID).innerText;
                        if(price)
                        {
                            price = price.match(/(\d|\.|,)+/)[0];
                        }
                        else
                        {
                            price = null;
                        }

                        var weight = document.getElementById('ajax_weight_'+productID).innerText;
                        if(weight)
                        {
                            weight = weight.match(/(\d|\.)+/)[0];
                        }
                        else
                        {
                            weight = null;
                        }

                        partsArray.push({"part_number": productNumber, "name": productName, "price": price, "weight": weight, "id":productID});
                    }
                    return {"parts_array":partsArray, "pagination_string":document.getElementById("paginationProducts").getElementsByTagName("SPAN")[0].innerText};
                });

                if(evaluationResults.parts_array)
                {
                    for(var i = 0; i < evaluationResults.parts_array.length; i++)
                    {
                        evaluationResults.parts_array[i]["category"] = category;
                        evaluationResults.parts_array[i]["subcategory"] = path;
                    }
                    // console.log(JSON.stringify(evaluationResults.parts_array));

                    if(evaluationResults.pagination_string.match(/1 -/))
                    {
                        evaluationResults.pagination_string = evaluationResults.pagination_string.match(/of \d+/)[0];
                        callback(evaluationResults.parts_array, evaluationResults.pagination_string.replace(/of /, ""), url);
                    }
                    else
                    {
                        callback(evaluationResults.parts_array);
                    }
                }
                else
                {
                    console.log("nothing scraped from " + url);
                    fileSystem.write('scrapeFailureURLList.txt', url + "\r", 'a');
                    callback(null);
                }
            }, maxResourceWait);
        }
        else
        {
            console.log(page.reasonURL + "\n" + page.reason);
            console.log("nothing scraped from " + url);
            fileSystem.write('scrapeFailureURLList.txt', url + "\r", 'a');
            callback(null);
        }
    });
}

function secondaryScrapeConstructor(partsList)
{
    // console.log(JSON.stringify(partsList));

    var currentIndex = partsList.length-1;
    secondaryScrapeManager();

    function secondaryScrapeManager()
    {
        if(currentIndex > -1)
        {
            console.log(currentIndex + 1 + " pages left");
            var waitTime = .5;//Math.floor((Math.random()*10+3)*10);
            console.log("secondary scrape current wait time " + waitTime + "seconds.");
            logTimestamp();
            setTimeout(secondaryScrape, waitTime*1000, partsList[currentIndex], secondaryScrapeManager);//waitTime*1000
            currentIndex--;
        }
        else
        {
            console.log("secondary scrape complete. attempting next category");
            queryConstructor();
        }
    }

    function secondaryScrape(primaryPartObject, callback)
    {
        var url = "https://parts.cat.com/en/catcorp/"+primaryPartObject.part_number;

        console.log("primary part object\n"+JSON.stringify(primaryPartObject));
        console.log("opening url "+url);

        page.open(url, function(status)
        {
            console.log("page load status  "+status);
            if(status === "success")
            {
                if(page.title == "Error")
                {
                    fileSystem.write('scrapeFailureURLList.txt', url + "\r", 'a');
                    return callback();
                }

                primaryPartObject.part_number = primaryPartObject.part_number.replace(/-/, "");
                setTimeout(function()
                {
                    var combinedPartObject = page.evaluate(function (_productID, price)
                    {
                        var totalQuantity = 0;
                        function randomQuantity()
                        {
                            var quantity = Math.floor(Math.random()*10);
                            totalQuantity += quantity;
                            return quantity;
                        }

                        var imageElement = document.getElementById("productMainImage");
                        if(!imageElement)
                        {
                            fileSystem.write('scrapeFailureURLList.txt', url + "\r", 'a');
                            return callback();
                        }

                        var imageSource = imageElement.src.replace(/\?.+/, "");

                        var shortDescription = document.getElementById("product_shortdescription_" + _productID).innerText;

                        var longDescriptionNode = document.getElementById("product_longdescription_" + _productID);
                        var longDescription =  longDescriptionNode.innerHTML;

                        if(longDescriptionNode.nextSibling.tagName == "P")
                        {
                            var currentElement = longDescriptionNode.nextSibling;
                            while(currentElement.tagName && currentElement.tagName != "SCRIPT")
                            {
                                longDescription += currentElement.innerHTML;
                                currentElement = currentElement.nextSibling;
                            }
                        }
                        longDescription.replace("\t", "");

                        // console.log("long description "+longDescription);

                        var specificationArray = [];
                        var specificationDiv = document.getElementById('usMetricResults');
                        if(specificationDiv)
                        {
                            var specificationList = specificationDiv.firstElementChild.getElementsByTagName('LI');

                            for(var j = 0; j < specificationList.length; j++)
                            {
                                var key = specificationList[j].firstElementChild.innerText;
                                key = key.replace(/: $/, "");
                                var value = specificationList[j].firstElementChild.nextElementSibling.innerText;
                                var object = {};
                                object[key] = value;

                                specificationArray.push(object);
                            }
                        }


                        var compatibleModelsJSON = [];

                        var compatibleModelsString = document.getElementById("schemaOrg_CompatibleModels").innerHTML;

                        var compatibleModels = compatibleModelsString.match(/<b>[\s\S]+?<br>[\s\S]+?<br>/g);

                        if(compatibleModels)
                        {
                            for(var j = 0; j < compatibleModels.length; j++)
                            {
                                compatibleModels[j] = compatibleModels[j].replace(/<(\/|b|r){1,2}>/g, "");
                                var key = compatibleModels[j].match(/(\w| )+/)[0];
                                compatibleModels[j] = compatibleModels[j].replace(/(\w| )+/, "");
                                var valuesArray = compatibleModels[j].match(/\w+/g);

                                var object = {};
                                object[key] = valuesArray;
                                compatibleModelsJSON.push(object);
                            }
                        }
                        else
                        {
                            compatibleModelsJSON = null;
                        }


                        var partObject = {};
                        partObject.image_source = imageSource;
                        partObject.shortDescription = shortDescription;
                        partObject.longDescription = longDescription;
                        partObject.specificationArray = specificationArray;
                        partObject.compatibleModelsArray = compatibleModelsJSON;
                        partObject.availability = {};

                        if(price && price != "")
                        {
                            partObject.availability =
                                {
                                    "Power Systems": randomQuantity(),
                                    "Seattle": randomQuantity(),
                                    "Port Angeles": randomQuantity(),
                                    "Mt. Vernon": randomQuantity(),
                                    "Fife": randomQuantity(),
                                    "Chehalis": randomQuantity(),
                                    "Yakima": randomQuantity(),
                                    "Wenatchee": randomQuantity(),
                                    "Monroe": randomQuantity(),

                                    "Anchorage": randomQuantity(),
                                    "Fairbanks": randomQuantity(),
                                    "Dutch Harbor": randomQuantity(),
                                    "Kodiak": randomQuantity(),
                                    "Juneau": randomQuantity(),
                                    "Wasilla": randomQuantity()
                                };
                        }

                        partObject.totalQuantity = totalQuantity;
                        totalQuantity = 0;

                        // console.log('scrape results\n'+ JSON.stringify(partObject));

                        return partObject;
                    }, primaryPartObject.id, primaryPartObject.price);

                    for (var attribute in primaryPartObject)
                    {
                        combinedPartObject[attribute] = primaryPartObject[attribute];
                    }
                    //testObject = Object.assign(testObject, partObject);

                    if(!combinedPartObject.name || combinedPartObject.name == "")
                    {
                        combinedPartObject.name = combinedPartObject.category;
                        // console.log("name "+ combinedPartObject.name +".");
                    }

                    fileSystem.write('cat_parts.copy',
                        JSON.stringify(combinedPartObject.availability) + "\t" +
                        sqlNullCheck(combinedPartObject.compatibleModelsArray, true) + "\t" +
                        combinedPartObject.image_source + "\t" +
                        sqlNullCheck(combinedPartObject.longDescription) + "\t" +
                        sqlNullCheck(combinedPartObject.shortDescription) + "\t" +
                        sqlNullCheck(combinedPartObject.specificationArray, true) + "\t" +
                        combinedPartObject.id + "\t" +
                        sqlNullCheck(combinedPartObject.name.catFormat()) + "\t" +
                        combinedPartObject.part_number + "\t" +
                        sqlNullCheck(combinedPartObject.price) + "\t" +
                        sqlNullCheck(combinedPartObject.weight) + "\t" +
                        combinedPartObject.category.catFormat() + "\t" +
                        combinedPartObject.subcategory.catFormat() + "\t" +
                        combinedPartObject.totalQuantity + "\r",
                        'a');

                    callback();

                }, maxResourceWait);
            }
            else
            {
                console.log(page.reasonURL + "\n" + page.reason);
                console.log("nothing scraped from " + url);
                fileSystem.write('scrapeFailureURLList.txt', url + "\r", 'a');
                callback();
            }
        });
    }
}

function sqlNullCheck(column, isJSON)
{
    if(!column || column == "")
    {
        column = "\\N";
    }
    else if(isJSON)
    {
        column = JSON.stringify(column);
    }

    return column;
}

var loadInProgress = false;

page.onLoadStarted = function() {
    loadInProgress = true;
    console.log('Loading started');
};

page.onLoadFinished = function() {
    loadInProgress = false;
    console.log('Loading finished');
};
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.onResourceError = function(resourceError)
{
    //sets error variables for logging
    page.reason = resourceError.errorString;
    page.reasonURL = resourceError.url;
};

//Lazy loading variables
var resourceWait  = 350,
    maxResourceWait = 10000,

    resourceTimer,
    currentResourceCount = 0;

page.onResourceRequested = function (req) {
    currentResourceCount += 1;
    // console.log('> ' + req.id + ' - ' + req.url);
    clearTimeout(resourceTimer);
};

page.onResourceReceived = function (res) {
    if (!res.stage || res.stage === 'end') {
        currentResourceCount -= 1;
        // console.log(res.id + ' ' + res.status + ' - ' + res.url);
        if (currentResourceCount === 0) {
            resourceTimer = setTimeout(null, resourceWait);
        }
    }
};