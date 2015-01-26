/**
 * Very simple lib for locales in Chrome
 */

function setTranslation() {
    var elements = document.querySelectorAll('*[i18n-locale]'),
        titles = document.querySelectorAll('*[i18n-title]'),
        values = document.querySelectorAll('*[i18n-value]'),
        placeholders = document.querySelectorAll('*[i18n-placeholder]');

    for (var i = 0, size = elements.length; i < size; i++) {
        var e = elements[i];

        e.textContent = chrome.i18n.getMessage(e.getAttribute('i18n-locale'));
    }

    for (var i = 0, size = placeholders.length; i < size; i++) {
        var et = placeholders[i];

        et.setAttribute('placeholder',chrome.i18n.getMessage(et.getAttribute('i18n-placeholder')));
    }

    for (var i = 0, size = titles.length; i < size; i++) {
        var et = titles[i];

        et.title = chrome.i18n.getMessage(et.getAttribute('i18n-title'));
    }

    for (var i = 0, size = values.length; i < size; i++) {
        var et = values[i];

        et.value = chrome.i18n.getMessage(et.getAttribute('i18n-value'));
    }
}