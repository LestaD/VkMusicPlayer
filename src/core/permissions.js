localStorage['newPermissions'] = 'audio,offline,status,wall';

if (localStorage['permissions'] != localStorage['newPermissions']) {
    localStorage['permissions'] = localStorage['newPermissions'];

    localStorage['authInfo'] = '';
    localStorage['statusAc'] = '';
}