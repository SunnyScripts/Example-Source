//Synopsis: This program uses Phantom.js to collect the business data of businesses who have WiFi on Yelp.com
//example url https://www.yelp.com/search?find_loc=San+Francisco,+CA&start=0&attrs=WiFi.free,WiFi.paid

var phantomPage = require('webpage');
var fileSystem = require('fs');
//The first and usually most important step is to organize what pages you plan to scrape.
//The best place to start is with the URI structure of the target website.
//In the case of Yelp, we have a "/search" path and a series of parameters.
//Three parameters were used: "find_loc"(city and state), "start"(page count offset), and "attrs"(business attributes).
// So that a successful scrape could have a list of cities and would iterate through the pages.

//Here we create a list of the cities we're interested in.
var cityList = [{city: "Seattle", stateID: "WA"}, {city: "San Francisco", stateID: "CA"}];

//One of the most difficult aspects of scraping is timing. We never want to put very much pressure on the servers we're scraping.
//Here we do an initial scrape of the city to get the total page count.
(function initialScrape() {
    if (cityList.length == 0)
        phantom.exit();

    var cityObject = cityList.pop();
    //Everything we do is asynchronous to prevent blocking the main thread with waiting.
    //The setTimeout function takes a callback function and a time for waiting. ie. setTimeout(callback, 1000);
    //The last three parameters here are are arguments for the setTimeout callback,
    // the last parameter being the callback for the getHTMLContent function.
    setTimeout(getHTMLContent, getWaitTimeAndLog(), cityObject, 0, function (totalPageCount) {
        var currentPageNumber = 0;
        (function primaryScrapeManager() {
            currentPageNumber += 10;
            //Here we have a repeat of the above setTimeout to function essentially as an inner loop.
            //It can be thought of as having a nested loop so that the outer loop iterates through the cities
            // and the inner loop iterates through each page.
            if (currentPageNumber < totalPageCount) {
                setTimeout(getHTMLContent, getWaitTimeAndLog(), cityObject, currentPageNumber, primaryScrapeManager);
            }
            else {
                initialScrape();
            }
        })();
    });
})();

//With the work of coordinating WHEN the scrapes will happen we get to the real meat, actually collecting data.
function getHTMLContent(cityObject, currentPage, callback) {
    //Phantom.js is a GUIless Webkit engine that gives us direct access to the DOM.
    //This means we can access elements directly as we would in native Javascript.
    //Each phantom page is its own isolated sandbox and requires a little setup.
    var page = phantomPage.create();
    var url = "https://www.yelp.com/search?find_loc=" + cityObject.city + ",+" + cityObject.stateID + "&start=" + currentPage + "&attrs=WiFi.free,WiFi.paid";

    //Here we see spoofing the userAgent and viewport size which at a larger scale are pulled from a realistically distributed list.
    page.settings.userAgent = "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36";
    page.viewportSize = {width: 1280, height: 1024};

    page.onConsoleMessage = function (msg) {
        console.log(msg);
    };
    page.onResourceError = function (resourceError) {
        //sets error variables for logging
        page.reason = resourceError.errorString;
        page.reasonURL = resourceError.url;
    };

    console.log("attempting to open URL " + url);
    page.open(url, function (status) {
        console.log('Page Status:\n' + status);
        if (status === "success") {
            var businessArray = page.evaluate(function (cityObject) {
                //The most important when scraping is to have a well defined output planned.
                //This schema will help outline how we end up parsing the raw HTML data and prevent us from having to scrape again in the same place.
                //Normally it is good to have some real HTML locally to prototype and iterate over as there is no perfect way to scrape data.
                //It is also best practice to do small test runs on as many weird outlier cases as you can find,
                // making sure that your code fails gracefully, even if that means logging the failed URL in a file for analysis.
                //Even in a worst case scenario, you could iterate over said file to obtain missed data.
                var businessArray = [];
                var businessElements = document.getElementsByClassName("natural-search-result");

                for (var i = 0; i < businessElements.length; i++) {
                    var businessID = businessElements[i].innerHTML.match(/biz\/[^"|?]*/)[0].replace("biz/", "");

                    var longLatRegex = businessID + '", "location":[^}]+';
                    var longLatChunk = document.body.innerHTML.match(new RegExp(longLatRegex))[0];

                    var categoriesElement = businessElements[i].getElementsByClassName("category-str-list")[0];
                    var categoryElements = categoriesElement.getElementsByTagName("A");

                    var categoryArray = [];

                    for (var j = 0; j < categoryElements.length; j++) {
                        categoryArray.push(categoryElements[j].innerHTML);
                    }
                    var fullAddress = "", street = "", zip = "", phoneNumber = "";
                    //Lastly I'd like to discuss one of my favorite problem solvers, Regular Expressions.
                    //Usually used as a last resort as they can EASILY become very costly on large data sets, they are quite versatile.
                    //As a part of many popular languages, RegEx allows us to access most any significant data.
                    //My go to method is to bring a chunk of data into a tool like regex101 to help me find a pattern that will work efficiently.
                    if (businessElements[i].getElementsByTagName("ADDRESS").length != 0) {
                        fullAddress = businessElements[i].getElementsByTagName("ADDRESS")[0].innerHTML.replace("<br>", ", ");
                        fullAddress = fullAddress.match(/([A-Z]|[0-9])[^<]*, [^\d]*\d*/)[0];

                        street = fullAddress.match(/[^,]+/)[0];
                        zip = fullAddress.match(/\d+$/)[0];
                    }

                    if (/\(\d{3}\) \d{3}-\d{4}/.test(businessElements[i].innerHTML)) {
                        phoneNumber = businessElements[i].innerHTML.match(/\(\d{3}\) \d{3}-\d{4}/)[0];
                    }
                    var businessObject =
                        {
                            id: businessID,
                            name: businessElements[i].innerHTML.match(/<span>[^<]+/)[0].replace("<span>", ""),
                            phoneNumber: phoneNumber,
                            category: categoryArray,
                            address:
                                {
                                    fullAddress: fullAddress,
                                    street: street,
                                    city: cityObject.city,
                                    state: cityObject.stateID,
                                    zip: zip
                                },
                            latitude: Number(longLatChunk.match(/latitude": -*\d*.\d*/)[0].replace('latitude": ', "")),
                            longitude: Number(longLatChunk.match(/longitude": -*\d*.\d*/)[0].replace('longitude": ', ""))
                        };
                    businessArray.push(businessObject);
                }
                return businessArray;
            }, cityObject);

            for (var i = 0; i < businessArray.length; i++) {
                fileSystem.write('wifi_data.json', JSON.stringify(businessArray[i]) + "\n", 'a');
            }
            callback(getTotalPageCount(page.content));
        }
        else {
            console.log(page.reasonURL + "\n" + page.reason);
            callback();
        }});
}
function getTotalPageCount(pageContent) {
    return Number(pageContent.match(/Page \d{1,2} of \d+/g)[0].replace(/Page \d{1,2} of /, ""));
}
 //  Utility  \\
//=============\\
function getWaitTimeAndLog() {
    var waitTime = Math.floor((Math.random() * 10 + 3) * 10);
    console.log(waitTime + " seconds until next scrape");
    return waitTime * 1000;}