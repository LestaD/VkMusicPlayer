var
    Port,
    Songs,
    LastActive,
    LastActiveIndex,
    FirstLoad = true;

/**
 * Main object
 *
 * @type {object} Object
 */
var Core = {};

Core.audioEvent = function() {
    var songs = document.getElementById('player-wrapper').getElementsByTagName('li');

    for(var i = 0, size = songs.length; i < size; i++) {
        var song = songs[i];

        song.addEventListener('click', Core.play);
    }
};

Core.play = function(e) {
    if(LastActiveIndex)
        Core.removeActiveIndex(LastActiveIndex);

    if(LastActive)
        LastActive.className = '';

    var element;

    if(e.target.nodeName == 'LI')
        element = e.target;
    else
        element = e.target.parentNode;

    var index = element.getAttribute('data-index');

    element.className = 'active';
    LastActive = element;

    MFCore.set(Songs[index].url, Songs[index].duration);
};

Core.removeActiveIndex = function(index) {
    document.getElementById('player-wrapper').getElementsByTagName('li')[index].className = '';
};

/**
 * Events
 *
 * @type {object}
 */
Core.event = {};

/**
 * Create connection
 */
Core.event.connect = function() {
    Port = chrome.runtime.connect();
};

/**
 * Listen for data
 */
Core.event.listenData = function() {
    chrome.runtime.onConnect.addListener(function(bgPort) {
        bgPort.onMessage.addListener(function(msg) {
            console.log(msg);
            Core.event[msg.event](msg.data);
        });
    });
};

Core.event.send = function(data) {
    Port.postMessage(data);
};

Core.event.firstLoad = function(data) {
    MFPlay.addEventListener('click', function() {
//        if() {
//            document.getElementById('player-wrapper').getElementsByTagName('li')[0].className = 'active';
//            FirstLoad = false;
//        }
    });
};

/**
 * Play song
 */
Core.event.sendPlay = function() {
    Core.event.send({
        event:'sendPlay',
        data: null
    })
};

Core.event.play = function(data) {
    MFPlay.addEventListener('click', function() {
        console.log(FirstLoad);
        if(FirstLoad) {
            Core.event.sendPlay();
            FirstLoad = false;
        } else {

        }
//        if() {
//            document.getElementById('player-wrapper').getElementsByTagName('li')[0].className = 'active';
//            FirstLoad = false;
//        }
    });
};

Core.event.sendSetFirstActive = function(data) {
    document.getElementById('player-wrapper').getElementsByTagName('li')[0].className = 'active';
};

Core.auth = function() {
    chrome.runtime.getBackgroundPage(function(win) {
        var node = document.importNode(win.document.getElementById('wrapper'), true);
        document.body.appendChild(node);
        Core.audioEvent();

        if(win.LastActiveIndex)
            LastActiveIndex = win.LastActiveIndex;

        MFCore.init();
        Core.event.listenData();
        Core.event.connect();
        Core.event.play();

    });
};

Core.init = function() {
    Core.auth();
};

window.addEventListener('DOMContentLoaded', Core.init);
