import React, { Component } from 'react';
import './App.css';
import MenuList from './List.js';
import StatesList from './StatesList';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import IconClose from 'react-icons/lib/md/close';
import IconEdit from 'react-icons/lib/md/mode-edit';
import IconSignalOff from 'react-icons/lib/md/signal-wifi-off';
import IconLock from 'react-icons/lib/md/lock';
import IconFullScreen from 'react-icons/lib/md/fullscreen';
import IconFullScreenExit from 'react-icons/lib/md/fullscreen-exit';
import IconMic from 'react-icons/lib/md/mic';
import Utils from './Utils';
import Dialog from '@material-ui/core/Dialog';
import DialogSettings from './States/SmartDialogSettings'
import RaisedButton from '@material-ui/core/Button';
import SpeechDialog from './SpeechDialog';
import Theme from './theme';
import MenuIcon from 'react-icons/lib/md/menu';
import I18n from "./i18n";

const isKeyboardAvailableOnFullScreen = (typeof Element !== 'undefined' && 'ALLOW_KEYBOARD_INPUT' in Element) && Element.ALLOW_KEYBOARD_INPUT;

const text2CommandInstance = 0;

const styles = {
    root: {
        flexGrow: 1,
    },
    flex: {
        flex: 1,
    },
    menuButton: {
        marginLeft: -12,
        marginRight: 20,
    },
};

class App extends Component {
    // ensure ALLOW_KEYBOARD_INPUT is available and enabled

    constructor(props) {
        super(props);

        let path = decodeURIComponent(window.location.hash).replace(/^#/, '');

        this.state = {
            menuFixed:      (typeof Storage !== 'undefined') ? window.localStorage.getItem('menuFixed') === '1' : false,
            open:           false,
            objects:        {},
            isListening:    false,
            loading:        true,
            connected:      false,
            refresh:        false,
            errorShow:      false,
            fullScreen:     false,
            editMode:       false,
            errorText:      '',
            masterPath:     path ? 'enum.' + path.split('.').shift() : 'enum.rooms',
            viewEnum:       path ? 'enum.' + path : '',
            width:          '0',
            editEnumSettings: false
        };
        this.state.open = this.state.menuFixed;

        this.states = {};
        this.tasks = [];
        this.user = 'admin';

        this.subscribes = {};
        this.requestStates = [];
        this.conn = window.servConn;
        this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
    }

    showError (err) {
        this.setState({errorText: err, errorShow: true});
    }

    componentDidUpdate (prevProps, prevState) {
        //console.log(prevProps);
    }

    componentDidMount () {
        this.updateWindowDimensions();
        window.addEventListener('resize', this.updateWindowDimensions);

        this.conn.namespace   = 'mobile.0';
        this.conn._useStorage = false;

        this.conn.init({
            name:          'mobile.0',  // optional - default 'vis.0'
            connLink:      (typeof socketUrl === 'undefined') ? '/' : undefined,  // optional URL of the socket.io adapter
//            socketSession: ''           // optional - used by authentication
        }, {
            onConnChange: isConnected => {
                if (isConnected) {
                    this.user = this.conn.getUser().replace(/^system\.user\./, '');

                    this.conn.getObjects(!this.state.refresh, (err, objects) => {
                        if (err) {
                            this.showError(err);
                        } else {
                            let viewEnum;
                            this.conn.getObject('system.config', (err, config) => {
                                if (objects && !this.state.viewEnum) {
                                    let reg = new RegExp('^' + this.state.masterPath + '\\.');
                                    // get first room
                                    for (let id in objects) {
                                        if (objects.hasOwnProperty(id) && reg.test(id)) {
                                            viewEnum = id;
                                            break;
                                        }
                                    }
                                }
                                objects['system.config'] = config;

                                I18n.setLanguage(config && config.common && config.common.language);

                                let keys = Object.keys(objects);
                                keys.sort();
                                let result = {};
                                for (let k = 0; k < keys.length; k++) {
                                    if (keys[k].match(/^system\./) && keys[k] !== 'system.config') continue;
                                    result[keys[k]] = {
                                        common: objects[keys[k]].common,
                                        type: objects[keys[k]].type
                                    };
                                }

                                if (viewEnum) {
                                    this.setState({objects: result || {}, viewEnum: viewEnum, loading: false});
                                } else {
                                    this.setState({objects: result || {}, loading: false});
                                }
                                this.conn.subscribe(['text2command.' + text2CommandInstance + '.response']);
                            });
                        }
                    });
                }
                this.setState({connected: isConnected, loading: true});
            },
            onRefresh: () => {
                window.location.reload();
            },
            onUpdate: (id, state) => {
                setTimeout(() => {
                    if (id) {
                        this.states[id] = state;
                    } else {
                        delete this.states[id];
                    }

                    if (this.subscribes[id]) {
                        this.subscribes[id].forEach(elem => elem.updateState(id, this.states[id]));
                    }

                    if (state && !state.ack && state.val && id === 'text2command.' + text2CommandInstance + '.response') {
                        this.speak(state.val);
                    }
                }, 0);
            },
            onError: err => {
                this.showError(err);
            }
        }, false, false);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowDimensions);
    }

    updateWindowDimensions() {
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() => {
            this.resizeTimer = null;
            this.setState({width: window.innerWidth/*, height: window.innerHeight*/});
        }, 200);
    }

    onToggleMenu () {
        if (this.state.menuFixed && typeof Storage !== 'undefined') {
            window.localStorage.setItem('menuFixed', '0');
        }
        this.setState({
            open: !this.state.open,
            menuFixed: false
        });
    }

    onToggleLock () {
        if (typeof Storage !== 'undefined') {
            window.localStorage.setItem('menuFixed', this.state.menuFixed ? '0': '1')
        }
        this.setState({menuFixed: !this.state.menuFixed});
    }

    static isFullScreenSupported() {
        let docElm = document.documentElement;
        return !!(docElm.requestFullScreen || docElm.mozRequestFullScreen || docElm.webkitRequestFullscreen || docElm.msRequestFullscreen);
    }

    static controlFullScreen(isFullScreen) {
        if (isFullScreen) {
            let element = document.documentElement;
            if (element.requestFullScreen) {
                element.requestFullScreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                // Safari temporary fix
                if (/Version\/[\d]{1,2}(\.[\d]{1,2}){1}(\.(\d){1,2}){0,1} Safari/.test(navigator.userAgent)) {
                    element.webkitRequestFullscreen();
                } else {
                    element.webkitRequestFullscreen(isKeyboardAvailableOnFullScreen);
                }
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        } else {
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    onToggleFullScreen () {
        App.controlFullScreen(!this.state.fullScreen);

        this.setState({fullScreen: !this.state.fullScreen});
    }

    onItemSelected(id) {
        window.location.hash = encodeURIComponent(id.replace(/^enum\./, ''));
        this.setState({viewEnum: id, open: this.state.menuFixed});
    }

    onRootChanged(root, page) {
        if (page) {
            window.location.hash = encodeURIComponent(page.replace(/^enum\./, ''));
            this.setState({masterPath: root, viewEnum: page});
        } else {
            this.setState({masterPath: root});
        }
    }

    updateIds(ids) {
        this.requestTimer = null;
        let _ids = this.requestStates;
        this.requestStates = [];

        this.conn.getStates(_ids, (err, states) => {
            Object.keys(states).forEach(id => {
                this.states[id] = states[id];
                if (!this.states[id]) delete this.states[id];

                if (this.subscribes[id]) {
                    this.subscribes[id].forEach(elem => elem.updateState(id, states[id]));
                }
            });
        });
    }

    /**
     *
     * @param {object} elem React visual element
     * @param {array} ids string or array of strings with IDs that must be subscribed or un-subscribed
     * @param {boolean} isMount true if subscribe and false if un-sibscribe
     */

    onCollectIds(elem, ids, isMount) {
        if (typeof ids !== 'object') {
            ids = [ids];
        }

        if (isMount) {
            let newIDs = [];
            ids.forEach(id => {
                if (!this.subscribes[id]) {
                    newIDs.push(id);
                }
                this.subscribes[id] = this.subscribes[id] || [];
                this.subscribes[id].push(elem);
            });
            if (newIDs.length) {
                this.conn.subscribe(newIDs);
                newIDs.forEach(id => {
                    if (this.requestStates.indexOf(id) === -1) {
                        this.requestStates.push(id);
                    }
                    if (this.requestTimer) {
                        clearTimeout(this.requestTimer);
                    }
                    this.requestTimer = setTimeout(() => {this.updateIds()}, 200);
                })
            }
        } else {
            let nonIDs = [];
            ids.forEach(id => {
                if (this.subscribes[id]) {
                    let pos = this.subscribes[id].indexOf(elem);
                    if (pos !== -1) {
                        this.subscribes[id].splice(pos, 1);
                    }

                    if (!this.subscribes[id].length) {
                        nonIDs.push(id);
                        delete this.subscribes[id];
                    }
                }
            });
            if (nonIDs.length) {
                this.conn.unsubscribe(nonIDs);
            }
        }
    }

    onControl(id, val) {
        this.conn.setState(id, val);
    }

    processTasks() {
        if (!this.tasks.length) {
            return;
        }

        const task = this.tasks[0];

        if (task.name === 'saveSettings') {
            this.conn.getObject(task.id, (err, obj) => {
                let settings = Utils.getSettings(obj, {user: this.user});
                if (JSON.stringify(settings) !== JSON.stringify(task.settings)) {
                    if (Utils.setSettings(obj, task.settings, {user: this.props.user, language: I18n.getLanguage()})) {
                        this.conn._socket.emit('setObject', obj._id, obj, err => {
                            if (!err) {
                                this.state.objects[obj._id] = obj;
                            }
                            this.tasks.shift();
                            if (err) console.error('Cannot save: ' + obj._id);
                            setTimeout(this.processTasks.bind(this), 0);
                        });
                    } else {
                        console.log('Invalid object: ' + task.id);
                        this.tasks.shift();
                        setTimeout(this.processTasks.bind(this), 0);
                    }
                } else {
                    this.tasks.shift();
                    setTimeout(this.processTasks.bind(this), 0);
                }
            });
        } else {
            this.tasks.shift();
            setTimeout(this.processTasks.bind(this), 0);
        }
    }

    onSaveSettings(id, settings) {
        this.tasks.push({name: 'saveSettings', id, settings});
        if (this.tasks.length === 1) {
            this.processTasks();
        }
    }

    getTitle () {
        if (!this.state.viewEnum || !this.state.objects) {
            return (<span>ioBroker</span>);
        }

        if (this.state.width < 500) {
            return (<span>{Utils.getObjectName(this.state.objects, this.state.viewEnum)}</span>);
        } else if (this.state.width < 1000) {
            return (<span>{Utils.getObjectName(this.state.objects, this.state.masterPath)} / {Utils.getObjectName(this.state.objects, this.state.viewEnum)}</span>);
        } else {
            return (<span>{Utils.getObjectName(this.state.objects, this.state.masterPath)} / {Utils.getObjectName(this.state.objects, this.state.viewEnum)}</span>);
        }
    }

    onSpeech(isStart) {
        this.setState({isListening: isStart});
    }

    onSpeechRec(text) {
        this.conn.setState('text2command.' + text2CommandInstance + '.text', text);
    }

    speak(text) {
        if (!window.SpeechSynthesisUtterance) {
            console.error('No support for speech synthesis on this platform!');
            return;
        }

        let voices = window.speechSynthesis.getVoices();
        if (!voices) {
            console.warn('No voices?');
            return;
        }
        let locale = this.getLocale();

        let utterance = new window.SpeechSynthesisUtterance(text);
        let voice = voices.find(voice => {
            return voice.lang === locale;
        });
        utterance.voice = voice;
        if (voice && voice.lang) {
            utterance.lang = voice.lang;
            window.speechSynthesis.speak(utterance);
        } else {
            console.log('No suitable language');
        }
    }

    getLocale() {
        let locale = 'de-DE';
        if (this.state.objects['system.config'] && this.state.objects['system.config'].common) {
            if (this.state.objects['system.config'].common.language === 'en') {
                locale = 'en-US';
            } else if (this.state.objects['system.config'].common.language === 'en') {
                locale = 'ru-RU';
            }
        }
        return locale;
    }

    toggleEditMode() {
        this.setState({editMode: !this.state.editMode});
    }
    editEnumSettingsOpen() {
        this.setState({editEnumSettings: true});
    }
    editEnumSettingsClose() {
        this.setState({editEnumSettings: false});
    }


    render() {
        return (
            <div>
                <AppBar
                    position="fixed"
                    style={{
                        width: this.state.menuFixed ? 'calc(100% - ' +  Theme.menu.width + 'px)' : '100%',
                        color: Theme.palette.textColor,
                        marginLeft: this.state.menuFixed ? Theme.menu.width : 0
                    }}
                >
                    <Toolbar>
                        {!this.state.menuFixed &&
                            (<IconButton color="inherit" aria-label="Menu" onClick={this.onToggleMenu.bind(this)} >
                                <MenuIcon/>
                            </IconButton>)}
                        <Typography variant="title" color="inherit" style={{flex: 1}}>
                            {this.getTitle()}
                        </Typography>
                        <div style={{color: Theme.palette.textColor}}>
                            {this.state.connected ? null : (<IconButton disabled={true}><IconSignalOff width={Theme.iconSize} height={Theme.iconSize}/></IconButton>)}
                            {this.state.editMode ? (<IconButton onClick={this.editEnumSettingsOpen().bind(this)} style={{color: this.state.editEnumSettings ? Theme.palette.editActive: Theme.palette.textColor}}><IconEdit width={Theme.iconSize} height={Theme.iconSize}/></IconButton>) : null}
                            <IconButton onClick={this.toggleEditMode.bind(this)} style={{color: this.state.editMode ? Theme.palette.editActive: Theme.palette.textColor}}><IconEdit width={Theme.iconSize} height={Theme.iconSize}/></IconButton>
                            {SpeechDialog.isSpeechRecognitionSupported() ? <IconButton style={{color: Theme.palette.textColor}} onClick={() => this.onSpeech(true)}><IconMic width={Theme.iconSize} height={Theme.iconSize}/></IconButton> : null}
                            {App.isFullScreenSupported() ?
                                <IconButton style={{color: Theme.palette.textColor}} onClick={this.onToggleFullScreen.bind(this)}>{this.state.fullScreen ? <IconFullScreenExit width={Theme.iconSize} height={Theme.iconSize} /> : <IconFullScreen width={Theme.iconSize} height={Theme.iconSize} />}</IconButton> : null}
                        </div>
                        {this.state.editEnumSettings ? (<DialogSettings key={'enum-settings'}
                                                           name={this.state.settings.name}
                                                           dialogKey={'enum-settings'}
                                                           settings={this.getDialogSettings()}
                                                           onSave={this.saveDialogSettings.bind(this)}
                                                           onClose={this.onSettingsClose.bind(this)}
                        />): null}
                    </Toolbar>
                </AppBar>

                <Drawer
                    variant={this.state.menuFixed ? 'permanent' : 'temporary'}
                    open={this.state.open} style={{width: Theme.menu.width}}>
                    <Toolbar>
                        <IconButton onClick={this.onToggleMenu.bind(this)} style={{color: Theme.palette.textColor}}>
                            <IconClose width={Theme.iconSize} height={Theme.iconSize} />
                        </IconButton>

                        <div style={{flex: 1}}>
                        </div>

                        {this.state.width > 500 && !this.state.menuFixed ?
                            (<IconButton onClick={this.onToggleLock.bind(this)} style={{float: 'right', color: Theme.palette.textColor}}>
                                <IconLock width={Theme.iconSize} height={Theme.iconSize}/>
                            </IconButton>)
                            : null
                        }
                    </Toolbar>
                    <MenuList
                        width={Theme.menu.width}
                        objects={this.state.objects}
                        user={this.user}
                        selectedId={this.state.viewEnum}
                        editMode={this.state.editMode}
                        root={this.state.masterPath}
                        onSaveSettings={this.onSaveSettings.bind(this)}
                        onRootChanged={this.onRootChanged.bind(this)}
                        onSelectedItemChanged={this.onItemSelected.bind(this)}
                    />
                </Drawer>
                <StatesList
                    loading={this.state.loading}
                    objects={this.state.objects}
                    user={this.user}
                    states={this.states}
                    editMode={this.state.editMode}
                    windowWidth={this.state.width}
                    marginLeft={this.state.menuFixed ? Theme.menu.width : 0}
                    enumID={this.state.viewEnum}
                    onSaveSettings={this.onSaveSettings.bind(this)}
                    onControl={this.onControl.bind(this)}
                    onCollectIds={this.onCollectIds.bind(this)}/>

                <Dialog
                    actions={(<RaisedButton
                        label="Ok"
                        primary={true}
                        onClick={() => this.setState({errorShow: false})}
                    />)}
                    modal={false}
                    open={this.state.errorShow}
                    onRequestClose={() => this.setState({errorShow: false})}
                >
                    {this.state.errorText}
                </Dialog>
                {SpeechDialog.isSpeechRecognitionSupported() ?
                    <SpeechDialog
                        objects={this.state.objects}
                        isShow={this.state.isListening}
                        locale={this.getLocale()}
                        onSpeech={this.onSpeechRec.bind(this)}
                        onFinished={() => this.onSpeech(false)}
                    /> : null}
            </div>
        );
    }
}

export default App;
