var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "Woovly Email Login|Woovly Login Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8260,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4085 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1552986038952,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986050241,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986050241,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1552986050242,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1552986050242,
                "type": ""
            }
        ],
        "screenShotFile": "003b0050-0043-0060-0092-007000390071.png",
        "timestamp": 1552986009847,
        "duration": 43593
    },
    {
        "description": "Verify Title After Logout|Woovly Login Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8260,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4085 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1552986057287,
                "type": ""
            }
        ],
        "screenShotFile": "00e1008c-0014-00f1-000c-009e001d00d5.png",
        "timestamp": 1552986054106,
        "duration": 3226
    },
    {
        "description": "Woovly Facebook Login|Woovly Login Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2400,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, (//input[@id='u_0_0'])[1])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, (//input[@id='u_0_0'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at fbLogin (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:144:22)\n    at C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:161:17\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4085 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1552986097160,
                "type": ""
            }
        ],
        "screenShotFile": "00bb00f8-00ed-001c-00e5-00e900f300c6.png",
        "timestamp": 1552986068407,
        "duration": 37506
    },
    {
        "description": "Verify Title After Logout|Woovly Login Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2400,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class='userOpt colour_white txt_cap align_center bolder display_flex flex_end transition300 flexdir_row poR'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class='userOpt colour_white txt_cap align_center bolder display_flex flex_end transition300 flexdir_row poR'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at System_Logout (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:174:27)\n    at WoovlyLogin.logOut (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:179:17)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Fb_Login.js:14:21)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Verify Title After Logout\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Fb_Login.js:13:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Fb_Login.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a800b1-00c0-0056-00c8-00f300f500f0.png",
        "timestamp": 1552986106311,
        "duration": 19
    },
    {
        "description": "case1 :- With User Feedback|Woovly Feedback Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10748,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4085 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1552986141057,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986152160,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986152160,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1552986152161,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1552986152161,
                "type": ""
            }
        ],
        "screenShotFile": "001e00f8-000e-0085-002e-00450020001c.png",
        "timestamp": 1552986111199,
        "duration": 49935
    },
    {
        "description": "case2 :- Without User information|Woovly Feedback Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10748,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"icon ic-more-vertical-fill makeWhite usesMobile ml_10 cursor_pointer poR mt_1\" onclick=\"hamBurger()\">...</div> is not clickable at point (1268, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"icon ic-more-vertical-fill makeWhite usesMobile ml_10 cursor_pointer poR mt_1\" onclick=\"hamBurger()\">...</div> is not clickable at point (1268, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at hamburgerMenu (C:\\Users\\Harish\\woovly-automation\\PO\\FeedbackPO.js:11:30)\n    at Feedback.Get_Feedback2 (C:\\Users\\Harish\\woovly-automation\\PO\\FeedbackPO.js:43:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Feedback.js:17:23)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"case2 :- Without User information\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Feedback.js:16:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Feedback.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00bd002a-001f-00b0-001a-00e200cd008c.png",
        "timestamp": 1552986161851,
        "duration": 138
    },
    {
        "description": "Positive Case1 :- Report Abuse for given options|Woovly Report Abuse Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11420,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, (//label[@class='pl_30 absolute_panel flex_start display_flex cursor_pointer closedn fleft ng-binding'])[1])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, (//label[@class='pl_30 absolute_panel flex_start display_flex cursor_pointer closedn fleft ng-binding'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at selectOption (C:\\Users\\Harish\\woovly-automation\\PO\\ReportabusePO.js:23:29)\n    at ReportAbuse.Get_Report_Abuse1 (C:\\Users\\Harish\\woovly-automation\\PO\\ReportabusePO.js:54:15)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run it(\"Positive Case1 :- Report Abuse for given options\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:7:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4085 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1552986196314,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986207632,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986207632,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1552986207634,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1552986207634,
                "type": ""
            }
        ],
        "screenShotFile": "00d20040-00c2-00a4-006b-004700920034.png",
        "timestamp": 1552986166999,
        "duration": 46222
    },
    {
        "description": "Positive Case2 :- Report Abuse from other options|Woovly Report Abuse Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11420,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"icon ic-more-fill transition300 dn_mobile\" ng-click=\"showReportOptions($event)\"></div> is not clickable at point (926, 554). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"icon ic-more-fill transition300 dn_mobile\" ng-click=\"showReportOptions($event)\"></div> is not clickable at point (926, 554). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickIcon (C:\\Users\\Harish\\woovly-automation\\PO\\ReportabusePO.js:15:25)\n    at ReportAbuse.Get_Report_Abuse2 (C:\\Users\\Harish\\woovly-automation\\PO\\ReportabusePO.js:62:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:17:26)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Positive Case2 :- Report Abuse from other options\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:16:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ba005d-0021-00a3-00db-005800b500b3.png",
        "timestamp": 1552986213650,
        "duration": 65
    },
    {
        "description": "Negative Case1 :- Without Selecting any options|Woovly Report Abuse Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11420,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"icon ic-more-fill transition300 dn_mobile\" ng-click=\"showReportOptions($event)\"></div> is not clickable at point (926, 554). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"icon ic-more-fill transition300 dn_mobile\" ng-click=\"showReportOptions($event)\"></div> is not clickable at point (926, 554). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickIcon (C:\\Users\\Harish\\woovly-automation\\PO\\ReportabusePO.js:15:25)\n    at ReportAbuse.Get_Report_Abuse3 (C:\\Users\\Harish\\woovly-automation\\PO\\ReportabusePO.js:75:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:24:26)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Negative Case1 :- Without Selecting any options\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:23:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00c200d9-003e-0012-0016-00fe00e20050.png",
        "timestamp": 1552986214048,
        "duration": 53
    },
    {
        "description": "Negative Case2 :- Withut Entering others Text Box|Woovly Report Abuse Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11420,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"icon ic-more-fill transition300 dn_mobile\" ng-click=\"showReportOptions($event)\"></div> is not clickable at point (926, 554). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"icon ic-more-fill transition300 dn_mobile\" ng-click=\"showReportOptions($event)\"></div> is not clickable at point (926, 554). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickIcon (C:\\Users\\Harish\\woovly-automation\\PO\\ReportabusePO.js:15:25)\n    at ReportAbuse.Get_Report_Abuse4 (C:\\Users\\Harish\\woovly-automation\\PO\\ReportabusePO.js:84:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:31:26)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Negative Case2 :- Withut Entering others Text Box\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:30:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Reportabuse.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00cc0034-0043-0089-0092-0050004400cf.png",
        "timestamp": 1552986214463,
        "duration": 71
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1784,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at inviteSubmit (C:\\Users\\Harish\\woovly-automation\\PO\\InvitePO.js:29:29)\n    at InviteFriend.Get_Invite_Friends1 (C:\\Users\\Harish\\woovly-automation\\PO\\InvitePO.js:51:15)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Invitefriend.js:7:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Invitefriend.js:6:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4085 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1552986248871,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986259965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986259965,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1552986259966,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1552986259966,
                "type": ""
            }
        ],
        "screenShotFile": "008400ba-0003-00f3-0065-00a1006d00d9.png",
        "timestamp": 1552986219304,
        "duration": 46854
    },
    {
        "description": "Negative Case1 :- Enter In-valid Email-id|Woovly Invite Friend Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1784,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"row fleft h60 align_center invite_friends_panel poR regular f_l13 pxy_20 mb_10 lh25 bradius mb_10 cursor_pointer poR\" onclick=\"getInviteeList(event)\">...</div> is not clickable at point (1116, 165). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"row fleft h60 align_center invite_friends_panel poR regular f_l13 pxy_20 mb_10 lh25 bradius mb_10 cursor_pointer poR\" onclick=\"getInviteeList(event)\">...</div> is not clickable at point (1116, 165). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickInvite (C:\\Users\\Harish\\woovly-automation\\PO\\InvitePO.js:16:27)\n    at InviteFriend.Get_Invite_Friends2 (C:\\Users\\Harish\\woovly-automation\\PO\\InvitePO.js:56:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Invitefriend.js:27:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Negative Case1 :- Enter In-valid Email-id\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Invitefriend.js:26:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Invitefriend.js:6:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005b00b8-0028-0072-0047-008500bf00fe.png",
        "timestamp": 1552986266537,
        "duration": 57
    },
    {
        "description": "Negative Case2 :- After Removing Email-id|Woovly Invite Friend Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1784,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"row fleft h60 align_center invite_friends_panel poR regular f_l13 pxy_20 mb_10 lh25 bradius mb_10 cursor_pointer poR\" onclick=\"getInviteeList(event)\">...</div> is not clickable at point (1116, 165). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"row fleft h60 align_center invite_friends_panel poR regular f_l13 pxy_20 mb_10 lh25 bradius mb_10 cursor_pointer poR\" onclick=\"getInviteeList(event)\">...</div> is not clickable at point (1116, 165). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickInvite (C:\\Users\\Harish\\woovly-automation\\PO\\InvitePO.js:16:27)\n    at InviteFriend.Get_Invite_Friends3 (C:\\Users\\Harish\\woovly-automation\\PO\\InvitePO.js:65:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Invitefriend.js:34:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Negative Case2 :- After Removing Email-id\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Invitefriend.js:33:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Invitefriend.js:6:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0037000d-00af-0080-00d0-009c00fd00b4.png",
        "timestamp": 1552986266937,
        "duration": 60
    },
    {
        "description": "Case 1: Existing Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15988,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4085 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1552986301112,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986312437,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986312437,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1552986312438,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1552986312438,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1552986344468,
                "type": ""
            }
        ],
        "screenShotFile": "0014002c-00b5-00e8-00a6-00ce004c006f.png",
        "timestamp": 1552986314558,
        "duration": 30077
    },
    {
        "description": "Case 2: Existing Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15988,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_Existing_Bucket2 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:154:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:22:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 2: Existing Bucket with Images & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:21:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00da000a-0093-00a1-0008-009d00960022.png",
        "timestamp": 1552986345054,
        "duration": 101
    },
    {
        "description": "Case 3: Existing Bucket with only Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15988,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_Existing_Bucket3 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:176:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:29:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 3: Existing Bucket with only Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:28:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f000ba-00f7-001a-00b1-00bc00d10079.png",
        "timestamp": 1552986345560,
        "duration": 87
    },
    {
        "description": "Case 4: Created New Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15988,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_New_Bucket4 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:197:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:36:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 4: Created New Bucket with Video & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:35:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "001200ea-0078-001a-00fb-007800a800f9.png",
        "timestamp": 1552986346097,
        "duration": 66
    },
    {
        "description": "Case 5: Created New Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15988,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_New_Bucket5 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:222:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:43:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 5: Created New Bucket with Images & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:42:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f0006a-009a-00ef-00db-002500fc0013.png",
        "timestamp": 1552986346547,
        "duration": 71
    },
    {
        "description": "Case 6: Created New Bucket with only Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15988,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_New_Bucket6 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:246:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:51:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 6: Created New Bucket with only Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:50:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002000f6-005e-0091-0041-009900b200ca.png",
        "timestamp": 1552986346993,
        "duration": 63
    },
    {
        "description": "Case 7: Created New Bucket with Images & Question Added & without TagUser|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15988,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"w_a poR\">...</div> is not clickable at point (1189, 30). Other element would receive the click: <div class=\"toast-message\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_Existing_Bucket7 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:268:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:58:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 7: Created New Bucket with Images & Question Added & without TagUser\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:57:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0087008f-0054-000d-000d-00c800a60088.png",
        "timestamp": 1552986347471,
        "duration": 60
    },
    {
        "description": "Case 1:- Create Story with Existing Bucketlist & Publish|Woovly Create Story Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14468,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //input[@class='storyTitle fLeft  txtOver ng-scope'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //input[@class='storyTitle fLeft  txtOver ng-scope'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at sendTitle (C:\\Users\\Harish\\woovly-automation\\PO\\AddstoryPO.js:84:27)\n    at AddStory.Get_New_Story1 (C:\\Users\\Harish\\woovly-automation\\PO\\AddstoryPO.js:180:15)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run it(\"Case 1:- Create Story with Existing Bucketlist & Publish\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:7:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4085 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1552986382377,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986393853,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986393854,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1552986393857,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1552986393857,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15529863993152 3556 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986399709,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15529863993152 3556 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986399710,
                "type": ""
            }
        ],
        "screenShotFile": "00f300ee-009d-0053-002f-005b00b200e8.png",
        "timestamp": 1552986352777,
        "duration": 61940
    },
    {
        "description": "Case 2:- Create Story with Existing Bucketlist & Save|Woovly Create Story Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14468,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"storyTxt fLeft editable\" contenteditable=\"true\" id=\"tarea-15529864349365\" placeholder=\"And write your story here\" spellcheck=\"false\" onkeypress=\"common.checkLength(this,event)\"></div> is not clickable at point (474, 63). Other element would receive the click: <input class=\"input_txt_small_x colour_white searchMain searchTransparent ng-pristine ng-untouched ng-valid ng-empty\" type=\"text\" placeholder=\"Search\" ng-keyup=\"searchRes($event)\" ng-model=\"searchTermG\" ng-model-options=\"{debounce: 500}\" autocomplete=\"new-password\">\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"storyTxt fLeft editable\" contenteditable=\"true\" id=\"tarea-15529864349365\" placeholder=\"And write your story here\" spellcheck=\"false\" onkeypress=\"common.checkLength(this,event)\"></div> is not clickable at point (474, 63). Other element would receive the click: <input class=\"input_txt_small_x colour_white searchMain searchTransparent ng-pristine ng-untouched ng-valid ng-empty\" type=\"text\" placeholder=\"Search\" ng-keyup=\"searchRes($event)\" ng-model=\"searchTermG\" ng-model-options=\"{debounce: 500}\" autocomplete=\"new-password\">\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at addDescription1 (C:\\Users\\Harish\\woovly-automation\\PO\\AddstoryPO.js:102:32)\n    at AddStory.Get_New_Story2 (C:\\Users\\Harish\\woovly-automation\\PO\\AddstoryPO.js:225:15)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run it(\"Case 2:- Create Story with Existing Bucketlist & Save\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:17:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15529864155045 3556 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986415798,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15529864155045 3556 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1552986415798,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15529864155045 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/AveriaSerifLibre-Regular.ttf",
                "timestamp": 1552986435516,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15529864155045 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/Courier-Regular.ttf",
                "timestamp": 1552986435577,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15529864155045 - OTS parsing error: overlapping tables",
                "timestamp": 1552986435577,
                "type": ""
            }
        ],
        "screenShotFile": "001b0014-0004-0019-001e-00d400470046.png",
        "timestamp": 1552986415303,
        "duration": 22840
    },
    {
        "description": "Case 3:- Create Story with new Bucketlist & Save|Woovly Create Story Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14468,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"txt_center align_center txt_cap poR mr_10 icon ic-plus plusIc ng-scope\" onclick=\"add_panel()\" ng-if=\"loggedInUser &amp;&amp; (loggedInUser.isAuthentication || !loggedInUser.isCustomeUser)\">...</div> is not clickable at point (1184, 70). Other element would receive the click: <div class=\"auto_scroller pt_20 pr_20\" style=\"height:100%\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"txt_center align_center txt_cap poR mr_10 icon ic-plus plusIc ng-scope\" onclick=\"add_panel()\" ng-if=\"loggedInUser &amp;&amp; (loggedInUser.isAuthentication || !loggedInUser.isCustomeUser)\">...</div> is not clickable at point (1184, 70). Other element would receive the click: <div class=\"auto_scroller pt_20 pr_20\" style=\"height:100%\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AddstoryPO.js:37:24)\n    at AddStory.Get_New_Story3 (C:\\Users\\Harish\\woovly-automation\\PO\\AddstoryPO.js:246:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:26:23)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 3:- Create Story with new Bucketlist & Save\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:25:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005a001a-0088-00c5-006b-005b00ea0064.png",
        "timestamp": 1552986438539,
        "duration": 72
    },
    {
        "description": "Case 4:- Create Story with new Bucketlist & Publish|Woovly Create Story Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14468,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"txt_center align_center txt_cap poR mr_10 icon ic-plus plusIc ng-scope\" onclick=\"add_panel()\" ng-if=\"loggedInUser &amp;&amp; (loggedInUser.isAuthentication || !loggedInUser.isCustomeUser)\">...</div> is not clickable at point (1184, 70). Other element would receive the click: <div class=\"auto_scroller pt_20 pr_20\" style=\"height:100%\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"txt_center align_center txt_cap poR mr_10 icon ic-plus plusIc ng-scope\" onclick=\"add_panel()\" ng-if=\"loggedInUser &amp;&amp; (loggedInUser.isAuthentication || !loggedInUser.isCustomeUser)\">...</div> is not clickable at point (1184, 70). Other element would receive the click: <div class=\"auto_scroller pt_20 pr_20\" style=\"height:100%\">...</div>\n  (Session info: chrome=73.0.3683.75)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AddstoryPO.js:37:24)\n    at AddStory.Get_New_Story4 (C:\\Users\\Harish\\woovly-automation\\PO\\AddstoryPO.js:288:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:33:23)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 4:- Create Story with new Bucketlist & Publish\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:32:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Addstory.js:5:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000c00a0-001c-00fc-00b5-004b0054004e.png",
        "timestamp": 1552986439019,
        "duration": 82
    },
    {
        "description": "Woovly Email Login|Woovly Login Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14956,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553406929107,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553406941708,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553406941709,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553406943139,
                "type": ""
            }
        ],
        "screenShotFile": "000f0038-0019-00d7-0026-008900b000d4.png",
        "timestamp": 1553406923883,
        "duration": 24222
    },
    {
        "description": "Verify Title After Logout|Woovly Login Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14956,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.75"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553406952231,
                "type": ""
            }
        ],
        "screenShotFile": "003800f0-00ee-0080-00a3-002c0053005b.png",
        "timestamp": 1553406949074,
        "duration": 3241
    },
    {
        "description": "Case 1: Existing Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7756,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)",
            "Failed: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickLogin (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:32:25)\n    at WoovlyLogin.Get_Email_Login (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:74:13)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\n    at UserContext.fn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:5325:13)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:9:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)",
            "NoSuchElementError: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_Existing_Bucket1 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:129:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:15:26)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 1: Existing Bucket with Video & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:13:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407037355,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/ 549:107 Uncaught ReferenceError: landingSignup is not defined",
                "timestamp": 1553407040186,
                "type": ""
            }
        ],
        "screenShotFile": "00bb00b8-00e5-007a-008d-007e001b0054.png",
        "timestamp": 1553407042295,
        "duration": 4088
    },
    {
        "description": "Case 2: Existing Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7756,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)",
            "Failed: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickLogin (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:32:25)\n    at WoovlyLogin.Get_Email_Login (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:74:13)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\n    at UserContext.fn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:5325:13)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:9:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)",
            "NoSuchElementError: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_Existing_Bucket2 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:154:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:23:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 2: Existing Bucket with Images & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:21:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407047513,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407048408,
                "type": ""
            }
        ],
        "screenShotFile": "007300e4-00dd-0068-00f1-004b00610008.png",
        "timestamp": 1553407047342,
        "duration": 1965
    },
    {
        "description": "Case 3: Existing Bucket with only Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7756,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)",
            "Failed: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickLogin (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:32:25)\n    at WoovlyLogin.Get_Email_Login (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:74:13)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\n    at UserContext.fn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:5325:13)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:9:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)",
            "NoSuchElementError: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_Existing_Bucket3 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:176:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:31:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 3: Existing Bucket with only Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:29:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407050248,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407050704,
                "type": ""
            }
        ],
        "screenShotFile": "000d002c-0020-0004-00c3-002500c200a8.png",
        "timestamp": 1553407049997,
        "duration": 979
    },
    {
        "description": "Case 4: Created New Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7756,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)",
            "Failed: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickLogin (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:32:25)\n    at WoovlyLogin.Get_Email_Login (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:74:13)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\n    at UserContext.fn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:5325:13)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:9:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)",
            "NoSuchElementError: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_New_Bucket4 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:197:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:39:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 4: Created New Bucket with Video & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:37:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407052904,
                "type": ""
            }
        ],
        "screenShotFile": "0092005f-001d-007c-007a-002e005900f1.png",
        "timestamp": 1553407052156,
        "duration": 1214
    },
    {
        "description": "Case 5: Created New Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7756,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)",
            "Failed: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickLogin (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:32:25)\n    at WoovlyLogin.Get_Email_Login (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:74:13)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\n    at UserContext.fn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:5325:13)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:9:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)",
            "NoSuchElementError: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_New_Bucket5 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:222:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:47:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 5: Created New Bucket with Images & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:45:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407054673,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407055051,
                "type": ""
            }
        ],
        "screenShotFile": "009f00d3-007d-0080-0084-002a00cd00b9.png",
        "timestamp": 1553407054483,
        "duration": 1750
    },
    {
        "description": "Case 6: Created New Bucket with only Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7756,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)",
            "Failed: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickLogin (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:32:25)\n    at WoovlyLogin.Get_Email_Login (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:74:13)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\n    at UserContext.fn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:5325:13)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:9:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)",
            "NoSuchElementError: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_New_Bucket6 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:246:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:56:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 6: Created New Bucket with only Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:54:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407057451,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407057844,
                "type": ""
            }
        ],
        "screenShotFile": "00690040-0090-0087-004a-00ea003200ff.png",
        "timestamp": 1553407057149,
        "duration": 1245
    },
    {
        "description": "Case 7: Created New Bucket with Images & Question Added & without TagUser|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7756,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)",
            "Failed: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628402 (536cd7adbad73a3783fdc2cab92ab2ba7ec361e1),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickLogin (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:32:25)\n    at WoovlyLogin.Get_Email_Login (C:\\Users\\Harish\\woovly-automation\\PO\\LoginPO.js:74:13)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\n    at UserContext.fn (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:5325:13)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at QueueRunner.execute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4199:10)\n    at queueRunnerFactory (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:909:35)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:9:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)",
            "NoSuchElementError: No element found using locator: By(xpath, (//div[@class='w_a poR'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at clickAdd (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:27:25)\n    at AskQuestion.Get_Question_With_Existing_Bucket7 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:268:15)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:64:28)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\nFrom: Task: Run it(\"Case 7: Created New Bucket with Images & Question Added & without TagUser\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:62:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407059609,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407059910,
                "type": ""
            }
        ],
        "screenShotFile": "000500b3-00aa-00de-004d-002c004b0014.png",
        "timestamp": 1553407059119,
        "duration": 1369
    },
    {
        "description": "Case 1: Existing Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407165042,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407176402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407176402,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407183561,
                "type": ""
            }
        ],
        "screenShotFile": "00190043-0087-0039-00f6-00fe0014007a.png",
        "timestamp": 1553407185817,
        "duration": 31127
    },
    {
        "description": "Case 2: Existing Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407217679,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407217679,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407217680,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407217819,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407217819,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407217871,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407217871,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407217871,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407217872,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407220053,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/41b97760-4df9-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407251769,
                "type": ""
            }
        ],
        "screenShotFile": "00f2008c-00d8-009b-0094-00fe00e8006a.png",
        "timestamp": 1553407217394,
        "duration": 49975
    },
    {
        "description": "Case 3: Existing Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407268180,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407268180,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407268180,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407268180,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407268180,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407268180,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407268181,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/41b97760-4df9-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407268181,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407268318,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407268319,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407268372,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407268373,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407268373,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407268373,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407270755,
                "type": ""
            }
        ],
        "screenShotFile": "00070071-0051-0050-002d-00a100970021.png",
        "timestamp": 1553407267863,
        "duration": 22539
    },
    {
        "description": "Case 4: Created New Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407291856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407291856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407291856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407291856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407291856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407291857,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407291857,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407292107,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407292108,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407292359,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407292360,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407292362,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407292363,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407295073,
                "type": ""
            }
        ],
        "screenShotFile": "00eb0025-000f-001d-007e-00f800660014.png",
        "timestamp": 1553407290931,
        "duration": 35397
    },
    {
        "description": "Case 5: Created New Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407327170,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407327170,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407327170,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407327170,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407327170,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407327170,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407327170,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407327625,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407327625,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407327832,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407327832,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407327833,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407327833,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407330012,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/8a085c70-4df9-11e9-bcbc-db258748901b.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553407366716,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/85c53480-4df9-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407366717,
                "type": ""
            }
        ],
        "screenShotFile": "00c40036-00bd-00a4-003f-006b007700ef.png",
        "timestamp": 1553407326775,
        "duration": 39933
    },
    {
        "description": "Case 6: Created New Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407368149,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407368149,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407368149,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407368150,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407368150,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407368150,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407368152,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/8a085c70-4df9-11e9-bcbc-db258748901b.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553407368152,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/85c53480-4df9-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407368153,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407368493,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407368493,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407369233,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407369234,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407369235,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407369236,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407372716,
                "type": ""
            }
        ],
        "screenShotFile": "00d50022-0079-0043-000d-00ec00b9005e.png",
        "timestamp": 1553407367342,
        "duration": 31490
    },
    {
        "description": "Case 7: Created New Bucket with Images & Question Added & without TagUser|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407400137,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407400139,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407400139,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407400140,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407400140,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407400140,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407400140,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407400912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407400912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407400997,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407400997,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407400998,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407400998,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407403583,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/b020dd10-4df9-11e9-bcbc-db258748901b.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553407426337,
                "type": ""
            }
        ],
        "screenShotFile": "00a9003b-00cd-001d-00b8-006000660092.png",
        "timestamp": 1553407399216,
        "duration": 30667
    },
    {
        "description": "Case 1: Existing Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2864,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407495123,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407506675,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407506675,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407506848,
                "type": ""
            }
        ],
        "screenShotFile": "008600a8-009d-00e4-009d-002b008f0023.png",
        "timestamp": 1553407510008,
        "duration": 39330
    },
    {
        "description": "Case 2: Existing Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2864,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407550144,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407550144,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407550145,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407550279,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407550280,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407550348,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407550348,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407550348,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407550348,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407552937,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/0d9da9f0-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407595732,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/0955ee20-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407595732,
                "type": ""
            }
        ],
        "screenShotFile": "001a0095-005c-0054-00b5-00c500d00023.png",
        "timestamp": 1553407549863,
        "duration": 53002
    },
    {
        "description": "Case 3: Existing Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2864,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/0d9da9f0-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/0955ee20-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407603602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407603721,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407603721,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407603764,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407603764,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407603764,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407603765,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407606045,
                "type": ""
            }
        ],
        "screenShotFile": "00bb009e-00ff-00b0-00d5-00ce00d700a8.png",
        "timestamp": 1553407603405,
        "duration": 22543
    },
    {
        "description": "Case 4: Created New Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2864,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407626654,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407626654,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407626655,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407626655,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407626655,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407626656,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407626657,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407626802,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407626803,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407626860,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407626860,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407626860,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407626861,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407629066,
                "type": ""
            }
        ],
        "screenShotFile": "00d50036-00dd-00b2-0045-0029000c008f.png",
        "timestamp": 1553407626380,
        "duration": 31638
    },
    {
        "description": "Case 5: Created New Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2864,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407658925,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407658927,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407658927,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407658927,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407658927,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407658927,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407658927,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407659097,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407659098,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407659189,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407659190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407659190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407659190,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407660989,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/4db94120-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407691734,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/49788a30-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407691785,
                "type": ""
            }
        ],
        "screenShotFile": "00f5004b-00d2-0008-008e-009c001d0053.png",
        "timestamp": 1553407658619,
        "duration": 35855
    },
    {
        "description": "Case 6: Created New Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2864,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407695239,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407695240,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407695240,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407695240,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407695240,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407695241,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407695242,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/4db94120-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407695242,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/49788a30-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407695243,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407695391,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407695391,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407695438,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407695438,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407695438,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407695438,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407696489,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/getPostIds - Failed to load resource: the server responded with a status of 504 ()",
                "timestamp": 1553407755870,
                "type": ""
            }
        ],
        "screenShotFile": "00dc00d5-003e-00ef-005c-006a002d00b1.png",
        "timestamp": 1553407694951,
        "duration": 78208
    },
    {
        "description": "Case 7: Created New Bucket with Images & Question Added & without TagUser|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2864,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407773703,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407773704,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407773704,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407773704,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407773704,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407773704,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407773704,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/getPostIds - Failed to load resource: the server responded with a status of 504 ()",
                "timestamp": 1553407773704,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407773940,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407773940,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407773985,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407773985,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407773986,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407773986,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407775354,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/8c84ffc0-4dfa-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553407795948,
                "type": ""
            }
        ],
        "screenShotFile": "00fb0084-007d-002d-0086-000600470020.png",
        "timestamp": 1553407773541,
        "duration": 26099
    },
    {
        "description": "Case 1: Existing Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18188,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553407927088,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407938057,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407938057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407938057,
                "type": ""
            }
        ],
        "screenShotFile": "00c8002a-0022-000e-0047-00ff00460055.png",
        "timestamp": 1553407940172,
        "duration": 28424
    },
    {
        "description": "Case 2: Existing Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18188,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407969309,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407969309,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407969309,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407969468,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553407969468,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407969523,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407969523,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407969523,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553407969524,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553407971697,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/00875530-4dfb-11e9-bcbc-db258748901b.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553408000643,
                "type": ""
            }
        ],
        "screenShotFile": "00450096-00ad-0037-002f-00480082000f.png",
        "timestamp": 1553407969048,
        "duration": 47185
    },
    {
        "description": "Case 3: Existing Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18188,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408016834,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408016834,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408016835,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408016835,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408016835,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408016835,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408016835,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/00875530-4dfb-11e9-bcbc-db258748901b.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553408016835,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408016956,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408016957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408017011,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408017012,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408017012,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408017012,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408018359,
                "type": ""
            }
        ],
        "screenShotFile": "003b0040-00d6-000a-00d3-0011001f0068.png",
        "timestamp": 1553408016650,
        "duration": 21515
    },
    {
        "description": "Case 4: Created New Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18188,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408038813,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408038813,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408038813,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408038813,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408038813,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408038813,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408038813,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408038948,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408038948,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408039003,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408039003,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408039004,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408039004,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408041008,
                "type": ""
            }
        ],
        "screenShotFile": "00380038-0025-0006-00ac-00e900df005f.png",
        "timestamp": 1553408038588,
        "duration": 30860
    },
    {
        "description": "Case 5: Created New Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18188,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408070080,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408070080,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408070080,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408070080,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408070080,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408070080,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408070081,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408070230,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408070230,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408070281,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408070281,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408070281,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408070281,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408072312,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/3d911880-4dfb-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553408101606,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/45fed750-4dfb-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553408101606,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/41ca2e50-4dfb-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553408101606,
                "type": ""
            }
        ],
        "screenShotFile": "005e0013-0067-004f-0030-001700450022.png",
        "timestamp": 1553408069851,
        "duration": 33830
    },
    {
        "description": "Case 6: Created New Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18188,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/3d911880-4dfb-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/45fed750-4dfb-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/41ca2e50-4dfb-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553408104290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408104428,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408104429,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408104474,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408104475,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408104475,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408104475,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408106622,
                "type": ""
            }
        ],
        "screenShotFile": "00c3006f-00cb-0002-0009-00dc00d30039.png",
        "timestamp": 1553408104072,
        "duration": 22163
    },
    {
        "description": "Case 7: Created New Bucket with Images & Question Added & without TagUser|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18188,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408126957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408126957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408126957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408126957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408126957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408126957,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408126957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408127099,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553408127099,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408127225,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408127225,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408127225,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553408127225,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553408129380,
                "type": ""
            }
        ],
        "screenShotFile": "005c007f-0096-0011-00fa-003300790078.png",
        "timestamp": 1553408126631,
        "duration": 25444
    },
    {
        "description": "Woovly Email Login|Woovly Login Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9136,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553740824980,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553740837325,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553740837325,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553740837437,
                "type": ""
            }
        ],
        "screenShotFile": "0033001b-0099-00fc-0033-008d00a000fb.png",
        "timestamp": 1553740823231,
        "duration": 20939
    },
    {
        "description": "Verify Title After Logout|Woovly Login Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9136,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553740848885,
                "type": ""
            }
        ],
        "screenShotFile": "001200eb-009d-002d-00de-00b800e000f8.png",
        "timestamp": 1553740845682,
        "duration": 3718
    },
    {
        "description": "Case 1: Existing Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11884,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553740874327,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553740887390,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553740887390,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553740888112,
                "type": ""
            }
        ],
        "screenShotFile": "003f00b3-0050-00be-0001-00d900a70007.png",
        "timestamp": 1553740898838,
        "duration": 31260
    },
    {
        "description": "Case 2: Existing Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11884,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, (//div[@class=' panel_shape display_flex flexdir_row align_center poR'])[1])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, (//div[@class=' panel_shape display_flex flexdir_row align_center poR'])[1])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at selectUser (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:76:27)\n    at AskQuestion.Get_Question_With_Existing_Bucket2 (C:\\Users\\Harish\\woovly-automation\\PO\\AskquestionPO.js:168:15)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run it(\"Case 2: Existing Bucket with Images & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:21:5)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553740931363,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553740931363,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553740931363,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553740931996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553740931996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553740932161,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553740932161,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553740932161,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553740932161,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553740980261,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/getUrl - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1553741083866,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/users - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1553741084089,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/getUrl - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1553741105669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/getUrl - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1553741105669,
                "type": ""
            }
        ],
        "screenShotFile": "00790005-0097-0070-00ec-000400a1006e.png",
        "timestamp": 1553740930673,
        "duration": 174993
    },
    {
        "description": "Case 3: Existing Bucket with only Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11884,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .toast-message)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .toast-message)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:34:61)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run it(\"Case 3: Existing Bucket with only Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:29:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741139620,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741139628,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741140350,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741140350,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741140351,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741140351,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741142707,
                "type": ""
            }
        ],
        "screenShotFile": "00d60061-001e-0082-00c3-00a500f00092.png",
        "timestamp": 1553741106087,
        "duration": 97237
    },
    {
        "description": "Case 4: Created New Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11884,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741204197,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741204198,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741204199,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741204199,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741204199,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741204199,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741204203,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741204345,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741204346,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741204402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741204402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741204402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741204402,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741206719,
                "type": ""
            }
        ],
        "screenShotFile": "00e80041-00cf-0055-003a-00f600de0067.png",
        "timestamp": 1553741203772,
        "duration": 32934
    },
    {
        "description": "Case 5: Created New Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11884,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741237391,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741237392,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741237392,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741237392,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741237392,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741237392,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741237392,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741237715,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741237716,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741237974,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741237974,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741237975,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741237975,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741240503,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/bf66dfd0-5129-11e9-a662-cb23833dd20a.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553741271219,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/bb2bf540-5129-11e9-a662-cb23833dd20a.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553741271219,
                "type": ""
            }
        ],
        "screenShotFile": "002700ab-00f2-00a5-0040-00ea004800ea.png",
        "timestamp": 1553741237130,
        "duration": 35567
    },
    {
        "description": "Case 6: Created New Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11884,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/bf66dfd0-5129-11e9-a662-cb23833dd20a.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/bb2bf540-5129-11e9-a662-cb23833dd20a.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553741273594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741273712,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741273712,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741273758,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741273759,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741273759,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741273759,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741276028,
                "type": ""
            }
        ],
        "screenShotFile": "00bb0074-00fe-00e4-00ce-00df006e00c4.png",
        "timestamp": 1553741273380,
        "duration": 23790
    },
    {
        "description": "Case 7: Created New Bucket with Images & Question Added & without TagUser|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11884,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741298070,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741298070,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741298071,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741298071,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741298071,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741298071,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741298072,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741298258,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741298259,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741298323,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741298323,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741298324,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741298324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741300753,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/e2de9de0-5129-11e9-a662-cb23833dd20a.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553741321508,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/de7661c0-5129-11e9-a662-cb23833dd20a.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553741321508,
                "type": ""
            }
        ],
        "screenShotFile": "00ff00b0-000b-0014-004a-002d00e200fc.png",
        "timestamp": 1553741297801,
        "duration": 27013
    },
    {
        "description": "Case 1: Existing Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 804,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553741358560,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741370008,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741370008,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741370011,
                "type": ""
            }
        ],
        "screenShotFile": "00020016-0056-0052-00a6-004f00a6001f.png",
        "timestamp": 1553741373165,
        "duration": 30173
    },
    {
        "description": "Case 2: Existing Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 804,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741406046,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741406046,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741406046,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741406234,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741406236,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741406282,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741406282,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741406283,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741406283,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741409083,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/232d2bf0-512a-11e9-a662-cb23833dd20a.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553741439508,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/1eecc320-512a-11e9-a662-cb23833dd20a.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553741439508,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/281ce790-512a-11e9-a662-cb23833dd20a.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553741440994,
                "type": ""
            }
        ],
        "screenShotFile": "00aa006b-00de-00a8-006f-008800a9000f.png",
        "timestamp": 1553741403911,
        "duration": 51348
    },
    {
        "description": "Case 3: Existing Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 804,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741456128,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741456128,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741456128,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741456128,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741456129,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741456129,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741456130,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/232d2bf0-512a-11e9-a662-cb23833dd20a.jpeg'. This content should also be served over HTTPS.",
                "timestamp": 1553741456130,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/1eecc320-512a-11e9-a662-cb23833dd20a.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553741456130,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/281ce790-512a-11e9-a662-cb23833dd20a.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553741456130,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741456302,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741456302,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741456349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741456349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741456349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741456349,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741458102,
                "type": ""
            }
        ],
        "screenShotFile": "005400a0-0051-000d-0049-004000d800f0.png",
        "timestamp": 1553741455734,
        "duration": 22682
    },
    {
        "description": "Case 4: Created New Bucket with Video & Question Added|Woovly Ask Question Module",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 804,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .toast-message)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .toast-message)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:42:61)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:118:7)\nFrom: Task: Run it(\"Case 4: Created New Bucket with Video & Question Added\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:37:7)\n    at addSpecsToSuite (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Harish\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Harish\\woovly-automation\\Specs\\Askquestion.js:7:1)\n    at Module._compile (module.js:649:30)\n    at Object.Module._extensions..js (module.js:660:10)\n    at Module.load (module.js:561:32)\n    at tryModuleLoad (module.js:501:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741479111,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741479111,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741479111,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741479111,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741479111,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741479112,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741479112,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741479341,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741479344,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741479512,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741479513,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741479513,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741479514,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741481423,
                "type": ""
            }
        ],
        "screenShotFile": "00b900ca-003d-0065-00ef-00a0002a0009.png",
        "timestamp": 1553741478936,
        "duration": 85073
    },
    {
        "description": "Case 5: Created New Bucket with Images & Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 804,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741564964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741564964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741564965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741564965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741564965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741564965,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741564965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741565336,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741565337,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741565530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741565530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741565531,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741565531,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741566760,
                "type": ""
            }
        ],
        "screenShotFile": "007e0067-00b3-0079-002d-0014009f0037.png",
        "timestamp": 1553741564487,
        "duration": 40408
    },
    {
        "description": "Case 6: Created New Bucket with only Question Added|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 804,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741605996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741605996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741605996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741605996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741605996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741605996,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741605996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741606121,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741606121,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741606408,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741606409,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741606410,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741606410,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741608983,
                "type": ""
            }
        ],
        "screenShotFile": "00450012-0086-0026-0026-00ee009700c4.png",
        "timestamp": 1553741605404,
        "duration": 29414
    },
    {
        "description": "Case 7: Created New Bucket with Images & Question Added & without TagUser|Woovly Ask Question Module",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 804,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741635540,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741635540,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741635540,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741635541,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741635541,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741635541,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741635541,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741635703,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553741635704,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741635834,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #bliImaages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741635834,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741635834,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - [DOM] Found 2 elements with non-unique id #forBliImages_vid: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1553741635834,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553741637235,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds - Mixed Content: The page at 'https://alpha.woovly.com/test.14/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/a796e070-512a-11e9-a662-cb23833dd20a.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553741658569,
                "type": ""
            }
        ],
        "screenShotFile": "003400b6-00b6-0069-0008-00c900a70025.png",
        "timestamp": 1553741635296,
        "duration": 26660
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

