/**
 * Very simple lib for locales on chrome
 */

function setTranslation() {
    var elements = document.querySelectorAll('*[i18n-locale]');

    for(var i = 0, size = elements.length; i < size; i++) {
        var e = elements[i];

        e.textContent = chrome.i18n.getMessage(e.getAttribute('i18n-locale'));
    }
}