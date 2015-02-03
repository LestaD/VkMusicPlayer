var
    progressLine = 0,
    progressTime = 0,
    songProgressWidth = 0,
    progressBarWidth = 0,
    progressBarClickState = false,
    volume = 0,
    PlayerWrapper,
    MFPlayer,
    MFBuffer,
    MFProgress,
    MFSongProgress,
    MFPlay,
    MFDuration,
    MFTimeCurrent,
    MFTimeAll,
    MFArtist,
    MFTitle,
    MFNext,
    MFPrev,
    MFVolumeWrapper,
    MFVolumeLine,
    MFVolume;


/**
 * MF Player Core
 *
 * @type {object} object
 */
var MFCore = {};

/**
 * Init DOM elements
 */
MFCore.setElements = function () {
    PlayerWrapper = document.getElementById('player-bound');
    MFPlayer = new Audio();
    MFBuffer = document.getElementById('mf-buffer');
    MFProgress = document.getElementById('mf-progress');
    MFSongProgress = document.getElementById('mf-song-progress');
    MFTimeAll = document.getElementById('mf-duration');
    MFTimeCurrent = document.getElementById('mf-current-time');
    MFPlay = document.getElementById('mf-play');
    MFArtist = document.getElementById('mf-artist');
    MFTitle = document.getElementById('mf-title');
    MFPrev = document.getElementById('mf-prev');
    MFNext = document.getElementById('mf-next');
    MFVolumeWrapper = document.getElementById('mf-volume-wrapper');
    MFVolumeLine = document.getElementById('mf-volume-line');
    MFVolume = document.getElementById('mf-volume');

    songProgressWidth = MFSongProgress.clientWidth;
};


/**
 * Change current time by mouse clicking
 * @param {event} e
 */
MFCore.changeCurrentTime = function (e) {
    progressLine = e.pageX - MFSongProgress.getBoundingClientRect().left;
    progressTime = (progressLine / songProgressWidth) * MFDuration;
    console.log(progressTime + ' '+ progressLine+ ' ' + e.pageX);
};

/**
 * Start play
 */
MFCore.startPlay = function () {
    MFPlayer.play();
    MFPlay.className += ' pause';
};

/**
 * Set player src
 *
 * @param {string} url
 * @param {number} duration
 */
MFCore.set = function (url, duration) {
    MFDuration = duration;
    MFTimeAll.textContent = VKit.util.secToMin(duration);
};

/**
 * Player front-end events
 */
MFCore.events = function () {
    MFSongProgress.addEventListener('mousedown', function (e) {
        progressBarClickState = true;
        MFCore.changeCurrentTime(e);
    });
    MFSongProgress.addEventListener('mousemove', function (e) {
        if (progressBarClickState)
            MFCore.changeCurrentTime(e);
    });
    MFSongProgress.addEventListener('mouseup', function () {
        progressBarClickState = false;
        Core.event.send({
            event: 'changeCurrentTime',
            data: progressTime
        });
    });

    MFPrev.addEventListener('click', MFCore.playPrev);
    MFNext.addEventListener('click', MFCore.playNext);

    MFVolume.addEventListener('input', function (e) {
        MFCore.changeVolume(e);
    });
};

/**
 * Play next song
 */
MFCore.playNext = function () {
    Core.event.send({
        event: 'playNext',
        data: true
    })
};

/**
 * Play prev song
 */
MFCore.playPrev = function () {
    Core.event.send({
        event: 'playPrev',
        data: ''
    })
};

/**
 * Change player volume
 *
 * @param {event} e
 */
MFCore.changeVolume = function (e) {
    var width = MFVolume.value + '%';
    MFVolumeLine.style.width = width;
    volume = MFVolume.value / MFVolume.max;

    Core.event.send({
        event: 'changeVolume',
        data: {
            volume: volume,
            volumeWidth: width,
            volumeValue: MFVolume.value
        }
    });
};

/**
 * Init Player
 */
MFCore.init = function () {
    MFCore.setElements();
    MFCore.events();
};