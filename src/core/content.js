var
    Port,
    mainKey,
    KeysPressed = [];

if(navigator.userAgent.indexOf('Macintosh') > -1)
    mainKey = 91;
else
    mainKey= 17;

var ContentJS = {};

ContentJS.event = {};

ContentJS.event.connect = function() {
    Port = chrome.runtime.connect({name: 'content'});
};

ContentJS.event.send = function(data) {
    Port.postMessage(data);
};

ContentJS.trackKeys = function() {
    document.addEventListener('keydown', function(e) {
        KeysPressed[e.keyCode] = true;

        if(KeysPressed[mainKey] && KeysPressed[120]) {
            ContentJS.event.send({
                event: 'playNext',
                data: true
            });
            delete KeysPressed[120];
        } else if(KeysPressed[mainKey] && KeysPressed[118]) {
            ContentJS.event.send({
                event: 'playPrev',
                data: ''
            });
            delete KeysPressed[118];
        } else if(KeysPressed[mainKey] && KeysPressed[119]) {
            ContentJS.event.send({
                event: 'setToPause',
                data: ''
            });
            delete KeysPressed[119];
        } else if(KeysPressed[mainKey] && KeysPressed[121]) {
            ContentJS.event.send({
                event: 'updateList',
                data: ''
            });
            delete KeysPressed[121];
        } else if(KeysPressed[mainKey] && KeysPressed[117]) {
            ContentJS.event.send({
                event: 'setRepeatSong',
                data: ''
            });
            delete KeysPressed[117];
        }
    });

    document.addEventListener('keyup', function(e) {
        delete KeysPressed[e.keyCode];
    });
};

ContentJS.init = function() {
    ContentJS.trackKeys();
    ContentJS.event.connect();

};

ContentJS.init();