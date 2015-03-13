/**
 * Check value for empty
 * @param val
 * @returns {boolean}
 */
function checkForEmpty(val) {
    return !!(val == '' || val == undefined);
}

/**
 * VK permissions
 * @type {string}
 */
localStorage['newPermissions'] = 'audio,offline,status,wall';

/**
 * Show desktop notification
 * @type {string}
 */
if(checkForEmpty(localStorage['showNotifications'])) {
    localStorage['showNotifications'] = 'true';
}

/**
 * Use https
 * @type {string}
 */
if(checkForEmpty(localStorage['useHttps'])) {
    localStorage['useHttps'] = '1';
}


if (localStorage['permissions'] != localStorage['newPermissions']) {
    localStorage['permissions'] = localStorage['newPermissions'];

    localStorage['authInfo'] = '';
    localStorage['statusAc'] = '';
}