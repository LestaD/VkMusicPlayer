var
    Port,
    KeysPressed = [];

var ContentJS = {};

ContentJS.event = {};

ContentJS.event.connect = function() {
    Port = chrome.runtime.connect({name: 'content'});
};

ContentJS.event.listenData = function() {
    chrome.runtime.onConnect.addListener(function(port) {
        port.onMessage.addListener(function(msg) {
            console.log(msg);
        });
    });
};

ContentJS.event.send = function(data) {
    Port.postMessage(data);
};

ContentJS.trackKeys = function() {
    document.addEventListener('keydown', function(e) {
        KeysPressed[e.keyCode] = true;

        if(KeysPressed[16] && KeysPressed[68]) {
            ContentJS.event.send({
                event: 'playNext',
                data: ''
            });
        } else if(KeysPressed[16] && KeysPressed[65]) {
            ContentJS.event.send({
                event: 'playPrev',
                data: ''
            });
        } else if(KeysPressed[16] && KeysPressed[83]) {
            ContentJS.event.send({
                event: 'setToPause',
                data: ''
            });
        } else if(KeysPressed[16] && KeysPressed[82]) {
            ContentJS.event.send({
                event: 'updateList',
                data: ''
            });
        }
    });

    document.addEventListener('keyup', function(e) {
        delete KeysPressed[e.keyCode];
    });
};

ContentJS.init = function() {

    ContentJS.trackKeys();
    ContentJS.event.listenData();
    ContentJS.event.connect();
};

ContentJS.init();