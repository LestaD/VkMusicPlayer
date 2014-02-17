/**
 * VK SDK for Chrome
 */


/**
 * VKit main object
 *
 * @type {object}
 */
var VKit = {};

/**
 * App ID
 *
 * @type {number}
 */
VKit.appID = 4186367;

/**
 * App permissions
 *
 * @type {string}
 */
VKit.permissions = 'audio,offline';

/**
 * Api Version
 *
 * @type {number}
 */
VKit.apiVer = 5.9;

/**
 * Redirect URL after successful authentication
 *
 * @type {string}
 */
VKit.redirectUrl = 'https://oauth.vk.com/blank.html';

/**
 * Type of auth window
 *
 * @type {string}
 */
VKit.displayWindow = 'popup';

/**
 * Response type after auth
 *
 * @type {string}
 */
VKit.responseType = 'token';

/**
 * VKit helper
 *
 * @type {object}
 */
VKit.util = {
    /**
     * Get auth url
     *
     * @returns {string} String
     */
    buildAuthUrl: function() {
        var arr = [
            'https://oauth.vk.com/authorize?client_id=', VKit.appID,
            '&scope=', VKit.permissions,
            '&redirect_uri=', VKit.redirectUrl,
            '&display=', VKit.displayWindow,
            '&v=', VKit.apiVer,
            '&response_type=', VKit.responseType
        ];

        return arr.join('');
    },

    /**
     * Get param value from url
     *
     * @param {string} url
     * @param {string} param
     * @returns {string}
     */
    getUrlParam: function(url, param) {
        var regexp = new RegExp(param + '=([\\w-]{0,})');
        return url.match(regexp)[1];
    },

    /**
     * Ajax wrapper
     *
     * @param {string} url
     * @param {function} callback
     */
    ajax: function(url, callback) {
        var ajax = new XMLHttpRequest();

        ajax.open('GET', url, true);
        ajax.send();

        ajax.onload = function() {
            callback(ajax.responseText);
        }
    },

    /**
     * Convert second to minutes
     *
     * @param {number} seconds
     * @returns {string}
     */
    secToMin: function(seconds) {
        var sec, min;

        sec = Math.floor(seconds);
        min = Math.floor(sec / 60);
        min = min >= 10 ? min : '0' + min;
        sec = Math.floor(sec % 60);
        sec = sec >= 10 ? sec : '0' + sec;
        return min + ':' + sec;
    }
};

/**
 * Save auth info
 *
 * @param {object} info
 */
VKit.saveAuthInfo = function(info) {
    localStorage['authInfo'] = JSON.stringify(info);
};

/**
 * Get auth info
 *
 * @param {token|userID|expires} key
 * @returns {string|object}
 */
VKit.authInfo = function(key) {
    var obj = JSON.parse(localStorage['authInfo']);

    if(key)
        return obj[key];
    else
        return obj;
};


/**
 * VK auth
 *
 * @param {string} buttonID
 * @param {function} callback
 */
VKit.auth = function(buttonID, callback) {
    var authButton = document.getElementById(buttonID);

    authButton.addEventListener('click', function() {
        var width = 500,
            height = 400,
            left = (screen.width / 2) - (width / 2),
            top = (screen.height / 2) - (height / 2);

        chrome.windows.create({
            'url': VKit.util.buildAuthUrl(),
            'type': 'popup',
            'width': width,
            'height': height,
            'left': left,
            'top': top
        }, function(window) {
            chrome.tabs.query({windowId: window.id, windowType: 'popup'}, function(tabs) {
                chrome.tabs.onUpdated.addListener(function(tabID, tabState, tab) {
                    if(tabs[0].id == tab.id) {
                        if(tab.url !== undefined && tabState.status == 'complete') {
                            if(tab.url.indexOf('access_token')) {
                                VKit.saveAuthInfo({
                                    token: VKit.util.getUrlParam(tab.url, 'access_token'),
                                    userID: VKit.util.getUrlParam(tab.url, 'user_id'),
                                    expires: VKit.util.getUrlParam(tab.url, 'expires_in')
                                });

                                chrome.windows.remove(window.id, callback);
                            }
                        }
                    }
                });
            });
        });
    });
};

/**
 * API request
 *
 * @param {string} method
 * @param {Array} params
 * @param {function} callback
 */
VKit.api = function(method, params, callback) {
    var parameters = params.join('&'),
        arr = ['https://api.vk.com/method/', method, '?', parameters, '&access_token=', VKit.authInfo('token')],
        url = arr.join('');

    VKit.util.ajax(url, callback);
};