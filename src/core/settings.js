VKit.trackUser();

var
    Overlay,
    ModalWindow,
    ModalContent,
    ModalTitle,
    AddUser,
    AddGroup,
    AccountsBlock,
    ShowSongsNumber,
    ShowSongDuration,
    COMMON_SETTINGS = {
        showSongsNumber: localStorage['showSongsOnBadge'],
        showSongDuration: localStorage['showSongDuration'],
        showNotifications: localStorage['showNotifications'],
        useHttps: localStorage['useHttps']
    },
    CACHE = {},
    Port;

var Settings = {};

/**
 * Events
 *
 * @type {object}
 */
Settings.event = {};

/**
 * Create connection
 */
Settings.event.connect = function () {
    setTimeout(function () {
        Port = chrome.runtime.connect({name: 'settings'});
    }, 300);
};

/**
 * Listen for data
 */
Settings.event.listenData = function () {
    chrome.runtime.onConnect.addListener(function (port) {
        if (port.name == 'bg') {
            port.onMessage.addListener(function (msg) {
                console.log(msg);
                if (Settings.event.hasOwnProperty(msg.event))
                    Settings.event[msg.event](msg.data);
            });
        }
    });
};

Settings.event.send = function (data) {
    Port.postMessage(data);
};

Settings.event.setActiveUser = function (e) {
    var id = e.target.getAttribute('data-id');

    Settings.event.send({
        event: 'setActiveUser',
        data: id
    });
};

Settings.event.updateSettingsView = function (data) {
    Settings.clearElement(AccountsBlock);
    Settings.loadAccounts();
};

Settings.event.showSongsOnBadge = function () {
    Settings.event.send({
        event: 'showSongsOnBadge',
        data: ShowSongsNumber.checked
    });
};

Settings.event.showSongDuration = function() {
    Settings.event.send({
        event: 'showSongDuration',
        data: ShowSongDuration.checked
    });
};

Settings.loadAccounts = function () {
    var usersInfo = VKit.getUserInfo(),
        div = document.createElement('div'),
        authInfo = JSON.parse(localStorage['authInfo']);

    for (var i in usersInfo) {
        var user = usersInfo[i],
            avatar = document.createElement('img'),
            name = div.cloneNode(false),
            userWrapper = div.cloneNode(false),
            status = div.cloneNode(false),
            del = document.createElement('button'),
            active = del.cloneNode(false);

        avatar.src = user.photo;
        name.textContent = user.firstName + ' ' + user.lastName;
        del.textContent = chrome.i18n.getMessage('delete');
        active.textContent = chrome.i18n.getMessage('activate');

        name.className = 'user-name';
        avatar.className = 'user-photo';
        userWrapper.className = 'info';
        del.className = 'delete-user regular-button';
        active.className = 'activate regular-button';

        del.setAttribute('data-id', i.toString());
        active.setAttribute('data-id', i.toString());

        userWrapper.appendChild(avatar);
        userWrapper.appendChild(name);
        userWrapper.appendChild(status);

        if (i == VKit.getActiveAccount()) {
            status.className = 'active';
            status.textContent = chrome.i18n.getMessage('active');
            del.className += ' top-button';
        } else {
            status.className = 'not-active';
            status.textContent = chrome.i18n.getMessage('notActive');

            active.addEventListener('click', Settings.event.setActiveUser);

            userWrapper.appendChild(active);
        }

        if (authInfo.userID != user.id) {
            del.addEventListener('click', function (e) {
                VKit.removeUserInfo(this.getAttribute('data-id'));
                Settings.clearElement(AccountsBlock);
                Settings.loadAccounts();

                Settings.event.send({
                    event: 'updateUsersList',
                    data: ''
                });
            });

            userWrapper.appendChild(del);
            AccountsBlock.appendChild(userWrapper);
        } else {
            var you = div.cloneNode(false);

            you.textContent = chrome.i18n.getMessage('itsYou');
            you.className = 'its-you';

            userWrapper.appendChild(you);

            if (AccountsBlock.getElementsByClassName('info')[0])
                AccountsBlock.insertBefore(userWrapper, AccountsBlock.getElementsByClassName('info')[0]);
            else
                AccountsBlock.appendChild(userWrapper);
        }
    }
};

Settings.clearElement = function (element) {
    var i = element.childElementCount;

    while (--i >= 0)
        element.removeChild(element.firstChild);
};

Settings.addUser = function (e) {
    var elAttr = e.target.getAttribute('id'),
        groupAdd = false;

    if (elAttr == 'add-group') {
        groupAdd = true;
    }

    if (elAttr == 'add-group') {
        ModalTitle.textContent = chrome.i18n.getMessage('addGroup');
    } else {
        ModalTitle.textContent = chrome.i18n.getMessage('addUser');
    }

    var input = document.createElement('input'),
        div = document.createElement('div'),
        info = {},
        result = div.cloneNode(false),
        error = div.cloneNode(false);

    if (elAttr == 'add-group') {
        error.textContent = chrome.i18n.getMessage('groupNotFound');
    } else {
        error.textContent = chrome.i18n.getMessage('userNotFound');
    }

    error.className = 'not-found';
    result.className = 'results';

    input.setAttribute('type', 'text');
    if (elAttr == 'add-group') {
        input.setAttribute('placeholder', chrome.i18n.getMessage('searchGroupExample'));
    } else {
        input.setAttribute('placeholder', chrome.i18n.getMessage('searchUserExample'));
    }

    input.className = 'user-find';

    input.addEventListener('input', function (e) {
        searchUser(this);
    });

    input.addEventListener('keyup', function (e) {
        if (e.which == 13)
            searchUser(this);
    });

    function searchUser(e) {
        if (e.value != '' && e.value != '0') {
            input.className += ' searching';

            if (elAttr == 'add-group') {

                VKit.api('groups.getById', ['group_id=' + e.value], function (response) {
                    input.classList.remove('searching');

                    var groupInfo = JSON.parse(response);

                    if (groupInfo.error != undefined) {
                        Settings.removeButtonsFromModal();
                        Settings.clearElement(result);
                        result.appendChild(error);
                    } else {
                        Settings.removeButtonsFromModal();
                        Settings.clearElement(result);

                        info = groupInfo.response[0];
                        console.log(info);
                        var avatar = document.createElement('img'),
                            name = div.cloneNode(false),
                            userWrapper = div.cloneNode(false),
                            add = div.cloneNode(false),
                            menuWrapper = div.cloneNode(false),
                            button = document.createElement('button'),
                            exist = div.cloneNode(false);

                        avatar.src = info.photo_100;
                        name.textContent = info.name;
                        button.textContent = chrome.i18n.getMessage('add');
                        exist.textContent = chrome.i18n.getMessage('alreadyInYourList');

                        name.className = 'user-name';
                        avatar.className = 'user-photo';
                        userWrapper.className = 'info';
                        button.className = 'regular-button';
                        menuWrapper.className = 'bottom-buttons';
                        exist.className = 'already-exists';

                        userWrapper.appendChild(avatar);
                        userWrapper.appendChild(name);

                        menuWrapper.appendChild(button);

                        var groupId = '-' + info.id;

                        if (VKit.getUserInfo(groupId) != undefined) {
                            userWrapper.appendChild(exist);
                        } else {
                            button.addEventListener('click', function () {
                                VKit.saveUserInfo({
                                    id: groupId,
                                    firstName: info.name,
                                    lastName: '',
                                    photo: info.photo_100,
                                    token: VKit.authInfo('token')
                                });
                                Settings.clearElement(AccountsBlock);
                                Settings.loadAccounts();
                                Settings.hideOverlay();

                                Settings.event.send({
                                    event: 'updateUsersList',
                                    data: ''
                                });
                            });

                            ModalContent.appendChild(menuWrapper);
                        }
                    }

                    result.appendChild(userWrapper);
                });
            } else {
                VKit.api('users.get', ['user_ids=' + e.value, 'fields=photo_100'], function (response) {
                    input.classList.remove('searching');

                    var userInfo = JSON.parse(response);

                    if (userInfo.error != undefined) {
                        Settings.removeButtonsFromModal();
                        Settings.clearElement(result);
                        result.appendChild(error);
                    } else {
                        Settings.removeButtonsFromModal();
                        Settings.clearElement(result);
                        info = userInfo.response[0];

                        var avatar = document.createElement('img'),
                            name = div.cloneNode(false),
                            userWrapper = div.cloneNode(false),
                            add = div.cloneNode(false),
                            menuWrapper = div.cloneNode(false),
                            button = document.createElement('button'),
                            exist = div.cloneNode(false);

                        avatar.src = info.photo_100;
                        name.textContent = info.first_name + ' ' + info.last_name;
                        button.textContent = chrome.i18n.getMessage('add');
                        exist.textContent = chrome.i18n.getMessage('alreadyInYourList');

                        name.className = 'user-name';
                        avatar.className = 'user-photo';
                        userWrapper.className = 'info';
                        button.className = 'regular-button';
                        menuWrapper.className = 'bottom-buttons';
                        exist.className = 'already-exists';

                        userWrapper.appendChild(avatar);
                        userWrapper.appendChild(name);

                        menuWrapper.appendChild(button);

                        if (VKit.getUserInfo(info.id) != undefined)
                            userWrapper.appendChild(exist);
                        else {
                            button.addEventListener('click', function () {
                                VKit.saveUserInfo({
                                    id: info.id,
                                    firstName: info.first_name,
                                    lastName: info.last_name,
                                    photo: info.photo_100,
                                    token: VKit.authInfo('token')
                                });
                                Settings.clearElement(AccountsBlock);
                                Settings.loadAccounts();
                                Settings.hideOverlay();

                                Settings.event.send({
                                    event: 'updateUsersList',
                                    data: ''
                                });
                            });

                            ModalContent.appendChild(menuWrapper);
                        }

                        result.appendChild(userWrapper);
                    }
                });
            }
        } else {
            Settings.clearElement(result);
        }
    }

    ModalContent.appendChild(input);
    ModalContent.appendChild(result);
    Settings.showOverlay();
};

Settings.removeButtonsFromModal = function () {
    var buttons = ModalContent.getElementsByClassName('bottom-buttons') || undefined;

    if (buttons) {
        for (var i = 0, size = buttons.length; i < size; i++) {
            if (buttons[i])
                ModalContent.removeChild(buttons[i]);
        }
    }
};

Settings.showOverlay = function () {
    Overlay.style.display = 'block';
    ModalWindow.style.display = 'block';
};

Settings.hideOverlay = function () {
    Overlay.style.display = 'none';
    ModalWindow.style.display = 'none';
    Settings.clearElement(ModalContent);
};

Settings.setElements = function () {
    Overlay = document.getElementById('bg-overlay');
    ModalWindow = document.getElementById('modal-window');
    ModalContent = document.getElementById('modal-content');
    ModalTitle = document.getElementById('modal-title');
    AddUser = document.getElementById('add-acc');
    AddGroup = document.getElementById('add-group');
    AccountsBlock = document.getElementById('accounts-block');
    ShowSongsNumber = document.getElementById('show-songs-number');
    ShowSongDuration = document.getElementById('show-song-duration');
    CACHE.SHOW_NOTIFICATIONS = document.getElementById('show-notifications');
    CACHE.USE_HTTPS = document.getElementById('use-https');
};

Settings.setEvents = function () {
    AddUser.addEventListener('click', Settings.addUser);
    AddGroup.addEventListener('click', Settings.addUser);
    Overlay.addEventListener('click', Settings.hideOverlay);
    ShowSongsNumber.addEventListener('change', Settings.songsNumberAction);
    ShowSongDuration.addEventListener('change', Settings.songsDurationAction);
    CACHE.SHOW_NOTIFICATIONS.addEventListener('change', Settings.commonSettingsInputHandler);
    CACHE.USE_HTTPS.addEventListener('change', Settings.commonSettingsInputHandler);
};

Settings.commonSettingsInputHandler = function() {
    var el = this,
        val = el.checked.toString();

    if(el.name == 'useHttps') {
        val = el.checked ? '1' : '0';
    }

    Settings.setLocalStorage(el.name, val);
};

Settings.songsNumberAction = function (e) {
    var el = this;

    if (el.checked == true) {
        ShowSongDuration.checked = false;
        Settings.setLocalStorage('showSongDuration', 'false');
    }

    Settings.setLocalStorage('showSongsOnBadge', el.checked);
    Settings.event.showSongsOnBadge();
};

Settings.songsDurationAction = function (e) {
    var el = this;

    if (el.checked == true) {
        ShowSongsNumber.checked = false;
        Settings.setLocalStorage('showSongsOnBadge', 'false');
    }

    Settings.setLocalStorage('showSongDuration', el.checked);
    Settings.event.showSongDuration();
};

Settings.setLocalStorage = function (key, val) {
    localStorage[key] = val;
};

Settings.common = function () {
    ShowSongsNumber.checked = COMMON_SETTINGS.showSongsNumber == 'true';
    ShowSongDuration.checked = COMMON_SETTINGS.showSongDuration == 'true';
    CACHE.SHOW_NOTIFICATIONS.checked = COMMON_SETTINGS.showNotifications == 'true';
    CACHE.USE_HTTPS.checked = COMMON_SETTINGS.useHttps == '1';
};

Settings.init = function () {
    Settings.event.listenData();
    Settings.event.connect();
    setTranslation();
    Settings.setElements();
    Settings.common();
    Settings.setEvents();
    Settings.loadAccounts();
};

window.addEventListener('DOMContentLoaded', Settings.init);