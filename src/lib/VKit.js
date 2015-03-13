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
VKit.permissions = localStorage['permissions'];

/**
 * Api Version
 *
 * @type {number}
 */
VKit.apiVer = 5.28;

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

        ajax.onload = function() {
            callback(ajax.responseText);
        };

        ajax.send();
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
        sec = Math.floor(sec % 60);
        sec = sec >= 10 ? sec : '0' + sec;
        return min + ':' + sec;
    }
};

/**
 * Save auth info
 *
 * @param {{token: string, userID: number, expires: number}} info
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
 * Get active account ID
 *
 * @returns {string}
 */
VKit.getActiveAccount = function() {
    return localStorage['activeAccount'];
};

/**
 * Set active account
 *
 * @param {string|number} id
 */
VKit.setActiveAccount = function(id) {
    localStorage['activeAccount'] = id;
};

/**
 * Save user info
 *
 * @param {{firstName: string, lastName: string, photo: string, token: string}}info
 */
VKit.saveUserInfo = function(info) {
    if(localStorage['userInfo'] != undefined) {
        var obj = JSON.parse(localStorage['userInfo']);
        obj[info.id] = info;
        localStorage['userInfo'] = JSON.stringify(obj);
    } else {
        var obj = {};
        obj[info.id] = info;
        localStorage['userInfo'] = JSON.stringify(obj);
    }
};

/**
 * Get user info by id or all users info
 *
 * @param {string|number} id
 * @returns {object}
 */
VKit.getUserInfo = function(id) {
    var obj = JSON.parse(localStorage['userInfo']);

    if(id)
        return obj[id];
    else
        return obj;
};

/**
 * Remove user info by id
 *
 * @param {number|string} id
 */
VKit.removeUserInfo = function(id) {
    var obj = VKit.getUserInfo();
    delete obj[id];
    localStorage['userInfo'] = JSON.stringify(obj);

    if(VKit.getActiveAccount() == id) {
        VKit.setActiveAccount(VKit.authInfo('userID'));

        Settings.event.send({
            event:'updateUsersList',
            data: ''
        });

        Settings.event.send({
            event: 'updateList',
            data: ''
        });
    }
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
        VKit.openAuthWindow(callback);
        window.close();
    });
};

/**
 * Open window for authorization in VK.com
 *
 * @param {function} callback
 */
VKit.openAuthWindow = function(callback) {
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
                        if(tab.url.indexOf('access_token') > -1) {
                            var id = VKit.util.getUrlParam(tab.url, 'user_id');

                            VKit.saveAuthInfo({
                                token: VKit.util.getUrlParam(tab.url, 'access_token'),
                                userID: id,
                                expires: VKit.util.getUrlParam(tab.url, 'expires_in')
                            });
                            VKit.setActiveAccount(id);

                            VKit.api('users.get', ['user_ids=' + VKit.authInfo('userID'), 'fields=photo_100'], function(response) {
                                var userInfo = JSON.parse(response).response[0];

                                VKit.saveUserInfo({
                                    id: userInfo.id,
                                    firstName: userInfo.first_name,
                                    lastName: userInfo.last_name,
                                    photo: userInfo.photo_100,
                                    token: VKit.authInfo('token')
                                });

                                localStorage['statusAc'] = 'true';
                                BG.checkForAuth();
                                chrome.windows.remove(window.id, callback);
                            });
                        }
                    }
                }
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
        arr = ['https://api.vk.com/method/', method, '?', parameters, '&v=', VKit.apiVer, '&https=', localStorage['useHttps'], '&access_token=', VKit.authInfo('token')],
        url = arr.join('');

    VKit.util.ajax(url, callback);
};

VKit.trackUser = function() {
    VKit.api('stats.trackVisitor',[], function(response) {});
};
