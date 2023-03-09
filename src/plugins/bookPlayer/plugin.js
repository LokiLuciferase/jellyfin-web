import { Events } from 'jellyfin-apiclient';
import 'material-design-icons-iconfont';

import loading from '../../components/loading/loading';
import keyboardnavigation from '../../scripts/keyboardNavigation';
import dialogHelper from '../../components/dialogHelper/dialogHelper';
import ServerConnections from '../../components/ServerConnections';
import Screenfull from 'screenfull';
import TableOfContents from './tableOfContents';
import dom from '../../scripts/dom';
import { translateHtml } from '../../scripts/globalize';

import '../../scripts/dom';
import '../../elements/emby-button/paper-icon-button-light';

import html from './template.html';
import './style.scss';

const THEMES = {
    'dark': { 'body': { 'color': '#d8dadc', 'background': '#000', 'font-size': 'medium' } },
    'sepia': { 'body': { 'color': '#d8a262', 'background': '#000', 'font-size': 'medium' } },
    'light': { 'body': { 'color': '#000', 'background': '#fff', 'font-size': 'medium' } }
};
const THEME_ORDER = ['dark', 'sepia', 'light'];
const FONT_SIZES = ['x-small', 'small', 'medium', 'large', 'x-large'];

export class BookPlayer {
    constructor() {
        this.name = 'Book Player';
        this.type = 'mediaplayer';
        this.id = 'bookplayer';
        this.priority = 1;
        if (userSettings.theme(undefined) === 'dark' || userSettings.theme(undefined) === null) {
            this.theme = 'dark';
        } else {
            this.theme = 'light';
        }
        this.fontSize = 'medium';
        this.onDialogClosed = this.onDialogClosed.bind(this);
        this.openTableOfContents = this.openTableOfContents.bind(this);
        this.rotateTheme = this.rotateTheme.bind(this);
        this.increaseFontSize = this.increaseFontSize.bind(this);
        this.decreaseFontSize = this.decreaseFontSize.bind(this);
        this.previous = this.previous.bind(this);
        this.next = this.next.bind(this);
        this.onWindowKeyUp = this.onWindowKeyUp.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
    }

    play(options) {
        this.progress = 0;
        this.cancellationToken = false;
        this.loaded = false;

        loading.show();
        const elem = this.createMediaElement();
        return this.setCurrentSrc(elem, options);
    }

    stop() {
        this.unbindEvents();

        const stopInfo = {
            src: this.item
        };

        Events.trigger(this, 'stopped', [stopInfo]);

        const elem = this.mediaElement;
        const tocElement = this.tocElement;
        const rendition = this.rendition;

        if (elem) {
            dialogHelper.close(elem);
            this.mediaElement = null;
        }

        if (tocElement) {
            tocElement.destroy();
            this.tocElement = null;
        }

        if (rendition) {
            rendition.destroy();
        }

        // hide loader in case player was not fully loaded yet
        loading.hide();
        this.cancellationToken = true;
    }

    destroy() {
        // Nothing to do here
    }

    currentItem() {
        return this.item;
    }

    currentTime() {
        return this.progress * 1000;
    }

    duration() {
        return 1000;
    }

    getBufferedRanges() {
        return [{
            start: 0,
            end: 10000000
        }];
    }

    volume() {
        return 100;
    }

    isMuted() {
        return false;
    }

    paused() {
        return false;
    }

    seekable() {
        return true;
    }

    onWindowKeyUp(e) {
        const key = keyboardnavigation.getKeyName(e);

        if (!this.loaded) return;
        switch (key) {
            case 'l':
            case 'ArrowRight':
            case 'Right':
                this.next();
                break;
            case 'j':
            case 'ArrowLeft':
            case 'Left':
                this.previous();
                break;
            case 'Escape':
                if (this.tocElement) {
                    // Close table of contents on ESC if it is open
                    this.tocElement.destroy();
                } else {
                    // Otherwise stop the entire book player
                    this.stop();
                }
                break;
        }
    }

    onTouchStart(e) {
        if (!this.loaded || !e.touches || e.touches.length === 0) return;

        // epubjs stores pages off the screen or something for preloading
        // get the modulus of the touch event to account for the increased width
        const touchX = e.touches[0].clientX % dom.getWindowSize().innerWidth;
        if (touchX < dom.getWindowSize().innerWidth / 2) {
            this.previous();
        } else {
            this.next();
        }
    }

    onDialogClosed() {
        this.stop();
    }

    bindMediaElementEvents() {
        const elem = this.mediaElement;

        elem.addEventListener('close', this.onDialogClosed, { once: true });
        elem.querySelector('#btnBookplayerExit').addEventListener('click', this.onDialogClosed, { once: true });
        elem.querySelector('#btnBookplayerToc').addEventListener('click', this.openTableOfContents);
        elem.querySelector('#btnBookplayerFullscreen').addEventListener('click', this.toggleFullscreen);
        elem.querySelector('#btnBookplayerRotateTheme').addEventListener('click', this.rotateTheme);
        elem.querySelector('#btnBookplayerIncreaseFontSize').addEventListener('click', this.increaseFontSize);
        elem.querySelector('#btnBookplayerDecreaseFontSize').addEventListener('click', this.decreaseFontSize);
        elem.querySelector('#btnBookplayerPrev')?.addEventListener('click', this.previous);
        elem.querySelector('#btnBookplayerNext')?.addEventListener('click', this.next);
    }

    bindEvents() {
        this.bindMediaElementEvents();

        document.addEventListener('keyup', this.onWindowKeyUp);

        this.rendition.on('touchstart', this.onTouchStart);
        this.rendition.on('keyup', this.onWindowKeyUp);
    }

    unbindMediaElementEvents() {
        const elem = this.mediaElement;

        elem.removeEventListener('close', this.onDialogClosed);
        elem.querySelector('#btnBookplayerExit').removeEventListener('click', this.onDialogClosed);
        elem.querySelector('#btnBookplayerToc').removeEventListener('click', this.openTableOfContents);
        elem.querySelector('#btnBookplayerFullscreen').removeEventListener('click', this.toggleFullscreen);
        elem.querySelector('#btnBookplayerRotateTheme').removeEventListener('click', this.rotateTheme);
        elem.querySelector('#btnBookplayerIncreaseFontSize').removeEventListener('click', this.increaseFontSize);
        elem.querySelector('#btnBookplayerDecreaseFontSize').removeEventListener('click', this.decreaseFontSize);
        elem.querySelector('#btnBookplayerPrev')?.removeEventListener('click', this.previous);
        elem.querySelector('#btnBookplayerNext')?.removeEventListener('click', this.next);
    }

    unbindEvents() {
        if (this.mediaElement) {
            this.unbindMediaElementEvents();
        }

        document.removeEventListener('keyup', this.onWindowKeyUp);

        this.rendition?.off('touchstart', this.onTouchStart);
        this.rendition?.off('keyup', this.onWindowKeyUp);
    }

    openTableOfContents() {
        if (this.loaded) {
            this.tocElement = new TableOfContents(this);
        }
    }

    toggleFullscreen() {
        if (Screenfull.isEnabled) {
            const icon = document.querySelector('#btnBookplayerFullscreen .material-icons');
            icon.classList.remove(Screenfull.isFullscreen ? 'fullscreen_exit' : 'fullscreen');
            icon.classList.add(Screenfull.isFullscreen ? 'fullscreen' : 'fullscreen_exit');
            Screenfull.toggle();
        }
    }

    rotateTheme() {
        if (this.loaded) {
            const newTheme = THEME_ORDER[(THEME_ORDER.indexOf(this.theme) + 1) % THEME_ORDER.length];
            this.rendition.themes.register('default', THEMES[newTheme]);
            this.rendition.themes.update('default');
            this.theme = newTheme;
            console.dir(this.rendition);
        }
    }

    increaseFontSize() {
        if (this.loaded && this.fontSize !== FONT_SIZES[FONT_SIZES.length - 1]) {
            const newFontSize = FONT_SIZES[(FONT_SIZES.indexOf(this.fontSize) + 1)];
            this.rendition.themes.fontSize(newFontSize);
            this.fontSize = newFontSize;
        }
    }

    decreaseFontSize() {
        if (this.loaded && this.fontSize !== FONT_SIZES[0]) {
            const newFontSize = FONT_SIZES[(FONT_SIZES.indexOf(this.fontSize) - 1)];
            this.rendition.themes.fontSize(newFontSize);
            this.fontSize = newFontSize;
        }
    }

    previous(e) {
        e?.preventDefault();
        if (this.rendition) {
            this.rendition.book.package.metadata.direction === 'rtl' ? this.rendition.next() : this.rendition.prev();
        }
    }

    next(e) {
        e?.preventDefault();
        if (this.rendition) {
            this.rendition.book.package.metadata.direction === 'rtl' ? this.rendition.prev() : this.rendition.next();
        }
    }

    createMediaElement() {
        let elem = this.mediaElement;
        if (elem) {
            return elem;
        }

        elem = document.getElementById('bookPlayer');
        if (!elem) {
            elem = dialogHelper.createDialog({
                exitAnimationDuration: 400,
                size: 'fullscreen',
                autoFocus: false,
                scrollY: false,
                exitAnimation: 'fadeout',
                removeOnClose: true
            });

            elem.id = 'bookPlayer';
            elem.innerHTML = translateHtml(html);

            dialogHelper.open(elem);
        }

        this.mediaElement = elem;
        return elem;
    }

    setCurrentSrc(elem, options) {
        const item = options.items[0];
        this.item = item;
        this.streamInfo = {
            started: true,
            ended: false,
            item: this.item,
            mediaSource: {
                Id: item.Id
            }
        };

        const serverId = item.ServerId;
        const apiClient = ServerConnections.getApiClient(serverId);

        if (!Screenfull.isEnabled) {
            document.getElementById('btnBookplayerFullscreen').display = 'none';
        }

        return new Promise((resolve, reject) => {
            import('epubjs').then(({ default: epubjs }) => {
                const downloadHref = apiClient.getItemDownloadUrl(item.Id);
                const book = epubjs(downloadHref, { openAs: 'epub' });

                // We need to calculate the height of the window beforehand because using 100% is not accurate when the dialog is opening.
                // In addition we don't render to the full height so that we have space for the top buttons.
                const clientHeight = document.body.clientHeight;
                const renderHeight = clientHeight - (clientHeight * 0.0425);

                const rendition = book.renderTo('bookPlayerContainer', {
                    width: '100%',
                    height: renderHeight,
                    // TODO: Add option for scrolled-doc
                    flow: 'paginated',
                    // Scripted content is required to allow touch event passthrough in Safari
                    allowScriptedContent: true
                });

                this.currentSrc = downloadHref;
                this.rendition = rendition;

                rendition.themes.register('default', THEMES[this.theme]);
                rendition.themes.select('default');

                return rendition.display().then(() => {
                    const epubElem = document.querySelector('.epub-container');
                    epubElem.style.opacity = '0';

                    this.bindEvents();

                    return this.rendition.book.locations.generate(1024).then(async () => {
                        if (this.cancellationToken) reject();

                        const percentageTicks = options.startPositionTicks / 10000000;
                        if (percentageTicks !== 0.0) {
                            const resumeLocation = book.locations.cfiFromPercentage(percentageTicks);
                            await rendition.display(resumeLocation);
                        }

                        this.loaded = true;
                        epubElem.style.opacity = '';
                        rendition.on('relocated', (locations) => {
                            this.progress = book.locations.percentageFromCfi(locations.start.cfi);
                            Events.trigger(this, 'pause');
                        });

                        loading.hide();
                        return resolve();
                    });
                }, () => {
                    console.error('failed to display epub');
                    return reject();
                });
            });
        });
    }

    canPlayMediaType(mediaType) {
        return (mediaType || '').toLowerCase() === 'book';
    }

    canPlayItem(item) {
        if (item.Path && item.Path.endsWith('epub')) {
            return true;
        }

        return false;
    }
}

export default BookPlayer;
