/**
 * Copyright 2018 bluefox <dogafox@gmail.com>
 *
 * Licensed under the Creative Commons Attribution-NonCommercial License, Version 4.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://creativecommons.org/licenses/by-nc/4.0/legalcode.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
import React from 'react';
import {decomposeColor} from '@material-ui/core/styles/colorManipulator';
import PropTypes from 'prop-types';
import Fab from '@material-ui/core/Fab';

import ColorsTempImg from '../assets/tempColor.png';
import ColorsImg from '../assets/rgb.png';
import SmartDialogGeneric from './SmartDialogGeneric';
import UtilsColors from '../UtilsColors';
import ColorSaturation from '../basic-controls/react-color-saturation/ColorSaturation';
import {TiLightbulb as IconLight} from 'react-icons/ti';
import {TiThermometer as IconTemp} from 'react-icons/ti';
import {MdColorLens as IconRGB} from 'react-icons/md';
import I18n from '../i18n';
import {withStyles} from '@material-ui/core/styles/index';

const HANDLER_SIZE = 32;
const styles = {
    buttonColorStyle: {
        position: 'absolute',
        left: 'calc(50% + 7rem)',
        bottom: '4rem',
        height: '2.5rem',
        width: '2.5rem',
        cursor: 'pointer'
    },
    dimmerSlider: {
        width: 'calc(100% - 3rem)',
        position: 'absolute',
        top: '25rem',
        left: 16
    },
    buttonOnOff: {
        position: 'absolute',
        left: 5,
        top: 5,
//        height: 24,
//        width: 36,
        background: '-webkit-gradient(linear, left bottom, left top, color-stop(0, #1d1d1d), color-stop(1, #131313))',
        boxShadow: '0 0.2em 0.1em 0.05em rgba(255, 255, 255, 0.1) inset, 0 -0.2em 0.1em 0.05em rgba(0, 0, 0, 0.5) inset, 0 0.5em 0.65em 0 rgba(0, 0, 0, 0.3)',
        color: 'rgb(99, 99, 99)',
        textShadow: '0 0 0.3em rgba(23,23,23)'
    },
    button: {
        width: 36,
        height: 36,
    },
    buttonOn: {
        color: '#3f3f3f',
        background: '#F8E900'
    },
    buttonOff: {
        color: '#ffffff',
        background: '#c0bdbe'
    },
    buttonColor: {
        position: 'absolute',
        left: 50,
        top: 5,
//        height: 24,
//        width: 36,
        background: '-webkit-gradient(linear, left bottom, left top, color-stop(0, #1d1d1d), color-stop(1, #131313))',
        boxShadow: '0 0.2em 0.1em 0.05em rgba(255, 255, 255, 0.1) inset, 0 -0.2em 0.1em 0.05em rgba(0, 0, 0, 0.5) inset, 0 0.5em 0.65em 0 rgba(0, 0, 0, 0.3)',
        color: 'rgb(99, 99, 99)',
        textShadow: '0 0 0.3em rgba(23,23,23)'
    },
    buttonRgb: {
        color: '#ffffff',
        background: '#ff6a5b'
    },
    buttonTemp: {
        color: '#ffffff',
        background: '#c0bdbe'
    },
    cursor: {
        position: 'absolute',
        cursor: 'pointer',
        zIndex: 12,
        pointerEvents: 'none',
        width: HANDLER_SIZE,
        height: HANDLER_SIZE,
        borderRadius: HANDLER_SIZE,
        boxSizing: 'border-box',
        border: '2px solid dimgrey'
    },
    colorCircle: {
        position: 'absolute',
        zIndex: 11,
        width: '100%',
        height: 'auto',
        top: '3rem',
        left: 0
    },
    div: {
        width: '20rem',
        position: 'absolute',
        height: '100%',
    }
};

const HEIGHT_HEADER  = 64;
const HEIGHT_COLOR   = 320;
const HEIGHT_DIMMER  = 64;

class SmartDialogColor extends SmartDialogGeneric  {
    // expected:
    static propTypes = {
        name:               PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object
        ]),
        windowWidth:        PropTypes.number,
        onClose:            PropTypes.func.isRequired,
        onRgbChange:        PropTypes.func,
        onDimmerChange:     PropTypes.func,
        onToggle:           PropTypes.func,
        ids:                PropTypes.object,
        startRGB:           PropTypes.string,
        startTemp:          PropTypes.number,
        startModeTemp:      PropTypes.bool,

        modeRGB:            PropTypes.bool,
        modeTemperature:    PropTypes.bool,

        startDimmer:        PropTypes.number,
        useDimmer:          PropTypes.bool,
        startOn:            PropTypes.bool,
        useOn:              PropTypes.bool,
    };

    constructor(props) {
        super(props);
        this.tMin = this.props.temperatureMin || 2200;
        this.tMax = this.props.temperatureMax || 6500;
        this.stateRx.color    = (this.props.startRGB || '#00FF00').toString();
        this.stateRx.temperature = this.props.startTemp || UtilsColors.rgb2temperature(this.stateRx.color);
        this.stateRx.dimmer   = this.props.useDimmer ? (this.props.startDimmer === null ? 100 : parseFloat(this.props.startDimmer) || 0) : 0;
        this.stateRx.on       = this.props.useOn ? (this.props.startOn === null ? true : !!this.props.startOn) : true;
        this.stateRx.tempMode = (this.props.startModeTemp && this.props.modeTemperature) || (!this.props.modeRGB && this.props.modeTemperature);

        this.onMouseMoveBind  = this.onMouseMove.bind(this);
        this.onMouseUpBind    = this.onMouseUp.bind(this);

        this.refColor         = React.createRef();
        this.refColorCursor   = React.createRef();
        this.refColorImage    = React.createRef();

        this.colorWidth = 0;
        this.colorTop   = 0;
        this.colorLeft  = 0;
        this.button = {
            time:  0,
            name:  '',
            timer: null
        };
        if (this.stateRx.tempMode) {
            this.dialogStyle = {background: 'rgba(154, 154, 154, 0.8)'};
        }

        this.setMaxHeight();
        this.componentReady();
    }

    componentWillReceiveProps(nextProps) {
        const newState = {};
        let changed = false;
        if (nextProps.startOn !== this.state.on) {
            newState.on = nextProps.startOn;
            changed = true;
        }
        /*if (nextProps.startDimmer !== this.state.dimmer) {
            newState.dimmer = nextProps.startDimmer;
            changed = true;
        }
        if (nextProps.startRGB !== this.state.color) {
            newState.color = nextProps.startRGB;
            changed = true;
        }*/
        if (changed) {
            this.setState(newState);
        }
    }

    setMaxHeight() {
        let maxHeight = 0;

        this.divs = {
            header:  {height: HEIGHT_HEADER,  visible: true},
            color:   {height: HEIGHT_COLOR,   visible: true},
            dimmer:  {height: HEIGHT_DIMMER,  visible: this.props.useDimmer}
        };

        // calculate positions
        for (const name in this.divs) {
            if (this.divs.hasOwnProperty(name) && this.divs[name].visible) {
                maxHeight += this.divs[name].height + 16;
            }
        }

        if (this.dialogStyle.maxHeight !== maxHeight) {
            this.dialogStyle.maxHeight = maxHeight;
        }
    }

    static createRgb(size) {
        size = size || 300;
        let rad;
        let oldRad;
        const d2r = Math.PI / 180;
        let c = document.createElement('canvas');
        c.width = c.height = size;
        let ctx = c.getContext('2d');
        let s;
        let t;

        for (let hr = size; hr > 1; hr--) {
            oldRad = 0;
            for(let i = 0; i < 360; i += 1) {
                rad = (i + 1) * d2r;
                s = hr / size;
                if (s > 0.5) {
                    t = (1 + Math.sin(Math.PI * (s + 0.5) * 2 - Math.PI / 2)) / 2;
                } else {
                    t = 0;
                }

                ctx.strokeStyle = 'hsl(' + (-i) + ', 100%, '+ (50 + (50 - t * 50)) + '%)';
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, hr / 2, oldRad, rad + 0.01);
                ctx.stroke();
                oldRad = rad;
            }
        }
        return c.toDataURL();
    }

    createCT(size) {
        size = size || 300;
        let rad;
        let oldRad;
        const d2r = Math.PI / 180;
        let c = document.createElement('canvas');
        c.width = c.height = size;
        let ctx = c.getContext('2d');

        for (let hr = size; hr > size * 0.8; hr--) {
            oldRad = 120 * d2r;
            for (let i = 0; i < 300; i += 1) {
                rad = (i + 120 + 1) * d2r;
                //s = 100 - Math.round(hr / size * 100);

                const rgb = UtilsColors.temperatureToRGB((i / 300) * (this.tMax - this.tMin) + this.tMin);
                ctx.strokeStyle = UtilsColors.rgb2string(rgb);
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, hr / 2 * 0.99, oldRad, rad + 0.01);
                ctx.stroke();
                oldRad = rad;
            }

        }
        return c.toDataURL();
    }

    tempToPos(temp, size) {
        let ratio = (temp - this.tMin) / (this.tMax - this.tMin);
        let h = (300 * ratio + 120) / 360;
        const R =  (size / 2);
        let x = R + Math.cos(Math.PI * 2 * h) * R;
        let y = R + Math.sin(Math.PI * 2 * h) * R;
        return {x, y};
    }

    posToTemp(x, y) {
        let h;
        if (x < 0) {
            h = Math.atan2(y, -x) * 180 / Math.PI;
            h = 180 - h;
        } else {
            h = Math.atan2(y, x) * 180 / Math.PI;
        }
        if (h < 0) h += 360;
        if (h > 90) {
            h -= 120;
        } else {
            h += 360 - 120;
        }

        if (h < 0) h = 0;
        if (h > 300) h = 300;
        h = h / 300; // => 0-1
        return h * (this.tMax - this.tMin) + this.tMin;
    }

    static colorToPos(color, size) {
        let c = decomposeColor(color);
        let hsl = UtilsColors.rgbToHsl(c.values[0], c.values[1], c.values[2]);
        let h = -hsl[0];
        if (isNaN(h)) h = 0;
        const R =  (size / 2);
        let x = R + Math.cos(Math.PI * 2 * h) * R;
        let y = R + Math.sin(Math.PI * 2 * h) * R;
        return {x, y};
    }

    static posToColor(x, y) {
        let h;
        if (x < 0) {
            h = Math.atan2(y, -x) * 180 / Math.PI;
            if (y > 0) {
                h = 180 - h;
            } else{
                h = 180 - h;
            }
        } else {
            h = Math.atan2(y, x) * 180 / Math.PI;
        }
        h = h * -1;
        if (h < 0) h += 360;
        h = h / 360;
        const rgb = UtilsColors.hslToRgb(h, 1, 0.5);
        let r = Math.round(rgb[0]).toString(16);
        let g = Math.round(rgb[1]).toString(16);
        let b = Math.round(rgb[2]).toString(16);
        if (r.length < 2) r = '0' + r;
        if (g.length < 2) g = '0' + g;
        if (b.length < 2) b = '0' + b;
        return '#' + r + g + b;
    }

    componentDidUpdate() {
        if (!this.colorWidth) {
            /*const h = this.refColor.current.offsetHeight - 6 * 16;
            if (h < this.refColor.current.offsetWidth) {
                this.colorWidth = h;
                this.refColor.current.style.width = this.colorWidth + 'px';
                this.refColor.current.style.left = 'calc(50% - ' + (this.colorWidth / 2) + 'px)';
            }*/
            this.colorWidth = this.refColorImage.current.offsetWidth;
            this.colorLeft = this.refColorImage.current.offsetLeft;
            this.colorTop = this.refColorImage.current.offsetTop;
            let pos = this.state.tempMode ? this.tempToPos(this.state.temperature, this.colorWidth - HANDLER_SIZE) : SmartDialogColor.colorToPos(this.state.color, this.colorWidth - HANDLER_SIZE);
            this.refColorCursor.current.style.top  = this.colorTop  + pos.y + (pos.y > 0 ? 0 : -HANDLER_SIZE) + 'px';
            this.refColorCursor.current.style.left = this.colorLeft + pos.x + (pos.x > 0 ? 0 : -HANDLER_SIZE) + 'px';
            this.rect = this.refColorImage.current.getBoundingClientRect();
        }
    }

    sendRGB() {
        if (this.props.useOn && !this.state.on) {
            this.setState({on: true});
            this.props.onToggle(true);
        }
        if (this.props.useDimmer) {
            if (!this.state.dimmer) {
                this.setState({dimmer: 100});
                this.props.onDimmerChange(100);
            }
        }

        if (this.state.tempMode) {
            this.props.onRgbChange(UtilsColors.rgb2string(UtilsColors.temperatureToRGB(this.state.temperature)), Math.round(this.state.temperature), SmartDialogColor.COLOR_MODES.TEMPERATURE);
        } else {
            this.props.onRgbChange(this.state.color, 0, SmartDialogColor.COLOR_MODES.RGB);
        }
    }

    onSwitchColorMode() {
        const newState = {tempMode: !this.state.tempMode};
        if (newState.tempMode) {
            // Temperature mode
            const rgb = UtilsColors.hex2array(this.state.color);
            newState.temperature = UtilsColors.rgb2temperature(rgb[0], rgb[1], rgb[2]);
            this.setDialogStyle({background: 'rgba(154, 154, 154, 0.8)', maxHeight: this.dialogStyle.maxHeight});
        } else {
            // Color mode
            newState.color = UtilsColors.rgb2string(UtilsColors.temperatureToRGB(this.state.temperature));
            this.setDialogStyle({maxHeight: this.dialogStyle.maxHeight});
        }
        this.setState(newState);
    }

    eventToValue(e) {
        let pageY = e.touches ? e.touches[e.touches.length - 1].clientY : e.pageY;
        let pageX = e.touches ? e.touches[e.touches.length - 1].clientX : e.pageX;
        const halfSize = this.colorWidth / 2;
        if (this.state.tempMode) {
            const temperature = this.posToTemp(pageX  - this.rect.left - halfSize, pageY - this.rect.top - halfSize);
            this.setState({temperature});
        } else {
            const color = SmartDialogColor.posToColor(pageX - this.rect.left - halfSize, pageY - this.rect.top - halfSize);
            this.setState({color});
        }

        if (this.changeTimer) {
            clearTimeout(this.changeTimer);
        }
        if (this.props.onRgbChange) {
            this.changeTimer = setTimeout(() => {
                this.changeTimer = null;
                this.sendRGB();
            }, 1000);
        }
    }

    onMouseMove(e) {
        e.preventDefault();
        e.stopPropagation();
        this.eventToValue(e);
    }

    onMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();

        this.eventToValue(e);

        document.addEventListener('mousemove',  this.onMouseMoveBind,   {passive: false, capture: true});
        document.addEventListener('mouseup',    this.onMouseUpBind,     {passive: false, capture: true});
        document.addEventListener('touchmove',  this.onMouseMoveBind,   {passive: false, capture: true});
        document.addEventListener('touchend',   this.onMouseUpBind,     {passive: false, capture: true});
    }

    onMouseUp(e) {
        e.preventDefault();
        e.stopPropagation();
        this.click = Date.now();

        if (this.changeTimer) {
            clearTimeout(this.changeTimer);
            this.changeTimer = null;
        }

        document.removeEventListener('mousemove',   this.onMouseMoveBind,   {passive: false, capture: true});
        document.removeEventListener('mouseup',     this.onMouseUpBind,     {passive: false, capture: true});
        document.removeEventListener('touchmove',   this.onMouseMoveBind,   {passive: false, capture: true});
        document.removeEventListener('touchend',    this.onMouseUpBind,     {passive: false, capture: true});

        this.sendRGB();
    }

    onClick() {
        this.click = Date.now();
    }

    getHue() {
        if (this.state.tempMode) {
            return '#FFFFFF';
        }
        let color = this.state.color;
        if (!color) {
            return '#FFFFFF';
        }
        const [r,g,b] = UtilsColors.hex2array(color);
        const [h/*,s,l*/] = UtilsColors.rgbToHsl(r, g, b);
        return h * 360;
    }

    onDimmerChanged(dimmer) {
        this.click = Date.now();
        this.setState({dimmer});
        if (this.changeTimer) {
            clearTimeout(this.changeTimer);
        }
        if (this.props.onRgbChange) {
            this.changeTimer = setTimeout(dimmer => {
                this.changeTimer = null;
                this.props.onDimmerChange(dimmer);
                if (dimmer && this.props.useOn && !this.state.on) {
                    this.setState({on: true});
                    this.props.onToggle(true);
                }
            }, 1000, dimmer);
        }
    }

    getOnOffButton() {
        if (!this.props.useOn) return null;
        const style = Object.assign(
            {},
            styles.buttonOnOff,
            this.state.on ? styles.buttonOn : styles.buttonOff);
        return (
            <Fab key="onoff-button"
                    variant="round"
                    color="primary"
                    aria-label="mute"
                    className={this.props.classes.button}
                    title={this.state.on ? I18n.t('Off') : I18n.t('On')}
                    style={style}
                    onClick={this.onToggle.bind(this)}
                    >
                <IconLight/>
            </Fab>);
    }

    getColorModeButton() {
        if (!this.props.modeTemperature || !this.props.modeRGB) return null;
        const style = Object.assign(
            {},
            styles.buttonColor,
            this.state.tempMode ?  styles.buttonRgb : styles.buttonTemp);
        return (
            <Fab key="color-mode-button"
                    variant="round"
                    className={this.props.classes.button}
                    color="primary"
                    aria-label="mute"
                    title={this.state.tempMode ? I18n.t('HUE') : I18n.t('Color temperature')}
                    style={style}
                    onClick={this.onSwitchColorMode.bind(this)}
            >
                {this.state.tempMode ? (<IconRGB/>) : (<IconTemp/>)}
            </Fab>);
    }

    onToggle() {
        this.onClick();
        this.props.onToggle && this.props.onToggle(!this.state.on);
        this.setState({on: !this.state.on});
    }

    generateContent() {
        let pos = this.state.tempMode ?
            this.tempToPos(this.state.temperature, this.colorWidth - HANDLER_SIZE) :
            SmartDialogColor.colorToPos(this.state.color, this.colorWidth - HANDLER_SIZE);

        if (this.state.tempMode) {
            this.imageCT = ColorsTempImg;// this.imageCT || this.createCT(600);
        }

        return [(
            <div key="color-dialog" ref={this.refColor}
                 className={this.props.classes.div}
                  style={{
                    width: this.colorWidth || '20rem',
                    left: 'calc(50% - ' + (this.colorWidth ? (this.colorWidth / 2) + 'px' : '10rem') + ')'
                  }}>
                <img ref={this.refColorImage}
                     alt="color"
                     src={this.state.tempMode ? this.imageCT : ColorsImg}//{ColorsImg}this.rgb || SmartDialogColor.createCT(600)}
                     onMouseDown={this.onMouseDown.bind(this)}
                     onTouchStart={this.onMouseDown.bind(this)}
                     className={this.props.classes.colorCircle}/>
                <div ref={this.refColorCursor}
                     className={this.props.classes.cursor}
                     style={{
                         background: this.state.tempMode ? UtilsColors.rgb2string(UtilsColors.temperatureToRGB(this.state.temperature)) : this.state.color,
                         top:  pos.y + this.colorTop  + (pos.y > 0 ? 0 : -HANDLER_SIZE),
                         left: pos.x + this.colorLeft + (pos.x > 0 ? 0 : -HANDLER_SIZE),
                     }}>
                </div>
            </div>),
            this.props.useDimmer ? (<div style={styles.dimmerSlider} key="dimmer">
                <ColorSaturation
                    hue={this.getHue()}
                    saturation={this.state.dimmer}
                    onChange={this.onDimmerChanged.bind(this)
                    }/>
            </div>) : null,
            this.getOnOffButton(),
            this.getColorModeButton()
        ];
    }
}

export default withStyles(styles)(SmartDialogColor);