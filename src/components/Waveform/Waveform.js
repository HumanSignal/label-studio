import CursorPlugin from "wavesurfer.js/dist/plugin/wavesurfer.cursor";
import React from "react";
import ReactDOM from "react-dom";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min.js";
import TimelinePlugin from "wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js";
import WaveSurfer from "wavesurfer.js";
import styles from "./Waveform.module.scss";
import { Slider, InputNumber, Row, Col } from "antd";

/**
 * Use formatTimeCallback to style the notch labels as you wish, such
 * as with more detail as the number of pixels per second increases.
 *
 * Here we format as M:SS.frac, with M suppressed for times < 1 minute,
 * and frac having 0, 1, or 2 digits as the zoom increases.
 *
 * Note that if you override the default function, you'll almost
 * certainly want to override timeInterval, primaryLabelInterval and/or
 * secondaryLabelInterval so they all work together.
 *
 * @param: seconds
 * @param: pxPerSec
 */
function formatTimeCallback(seconds, pxPerSec) {
  seconds = Number(seconds);
  var minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;

  // fill up seconds with zeroes
  var secondsStr = Math.round(seconds).toString();
  if (pxPerSec >= 25 * 10) {
    secondsStr = seconds.toFixed(2);
  } else if (pxPerSec >= 25 * 1) {
    secondsStr = seconds.toFixed(1);
  }

  if (minutes > 0) {
    if (seconds < 10) {
      secondsStr = "0" + secondsStr;
    }
    return `${minutes}:${secondsStr}`;
  }
  return secondsStr;
}

/**
 * Use timeInterval to set the period between notches, in seconds,
 * adding notches as the number of pixels per second increases.
 *
 * Note that if you override the default function, you'll almost
 * certainly want to override formatTimeCallback, primaryLabelInterval
 * and/or secondaryLabelInterval so they all work together.
 *
 * @param: pxPerSec
 */
function timeInterval(pxPerSec) {
  var retval = 1;
  if (pxPerSec >= 25 * 100) {
    retval = 0.01;
  } else if (pxPerSec >= 25 * 40) {
    retval = 0.025;
  } else if (pxPerSec >= 25 * 10) {
    retval = 0.1;
  } else if (pxPerSec >= 25 * 4) {
    retval = 0.25;
  } else if (pxPerSec >= 25) {
    retval = 1;
  } else if (pxPerSec * 5 >= 25) {
    retval = 5;
  } else if (pxPerSec * 15 >= 25) {
    retval = 15;
  } else {
    retval = Math.ceil(0.5 / pxPerSec) * 60;
  }
  return retval;
}

/**
 * Return the cadence of notches that get labels in the primary color.
 * EG, return 2 if every 2nd notch should be labeled,
 * return 10 if every 10th notch should be labeled, etc.
 *
 * Note that if you override the default function, you'll almost
 * certainly want to override formatTimeCallback, primaryLabelInterval
 * and/or secondaryLabelInterval so they all work together.
 *
 * @param pxPerSec
 */
function primaryLabelInterval(pxPerSec) {
  var retval = 1;
  if (pxPerSec >= 25 * 100) {
    retval = 10;
  } else if (pxPerSec >= 25 * 40) {
    retval = 4;
  } else if (pxPerSec >= 25 * 10) {
    retval = 10;
  } else if (pxPerSec >= 25 * 4) {
    retval = 4;
  } else if (pxPerSec >= 25) {
    retval = 1;
  } else if (pxPerSec * 5 >= 25) {
    retval = 5;
  } else if (pxPerSec * 15 >= 25) {
    retval = 15;
  } else {
    retval = Math.ceil(0.5 / pxPerSec) * 60;
  }
  return retval;
}

/**
 * Return the cadence of notches to get labels in the secondary color.
 * EG, return 2 if every 2nd notch should be labeled,
 * return 10 if every 10th notch should be labeled, etc.
 *
 * Secondary labels are drawn after primary labels, so if
 * you want to have labels every 10 seconds and another color labels
 * every 60 seconds, the 60 second labels should be the secondaries.
 *
 * Note that if you override the default function, you'll almost
 * certainly want to override formatTimeCallback, primaryLabelInterval
 * and/or secondaryLabelInterval so they all work together.
 *
 * @param pxPerSec
 */
function secondaryLabelInterval(pxPerSec) {
  // draw one every 10s as an example
  return Math.floor(10 / timeInterval(pxPerSec));
}

export default class Waveform extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      src: this.props.src,
      pos: 0,
      colors: {
        waveColor: "#97A0AF",
        progressColor: "#52c41a",
      },
      zoom: 20,
      speed: 1,
      volume: 1,
    };
  }

  /**
   * Handle to change zoom of wave
   */
  onChangeZoom = value => {
    this.setState({
      ...this.state,
      zoom: value,
    });

    this.wavesurfer.zoom(value);
  };

  onChangeVolume = value => {
    this.setState({
      ...this.state,
      volume: value,
    });

    this.wavesurfer.setVolume(value);
  };

  /**
   * Handle to change speed of wave
   */
  onChangeSpeed = value => {
    this.setState({
      ...this.state,
      speed: value,
    });

    this.wavesurfer.setPlaybackRate(value);
  };

  componentDidMount() {
    this.$el = ReactDOM.findDOMNode(this);

    this.$waveform = this.$el.querySelector("#wave");

    let wavesurferConfigure = {
      container: this.$waveform,
      waveColor: this.state.colors.waveColor,
      height: this.props.height,
      backend: "MediaElement",
      progressColor: this.state.colors.progressColor,
    };

    if (this.props.regions) {
      wavesurferConfigure = {
        ...wavesurferConfigure,
        plugins: [
          RegionsPlugin.create({
            dragSelection: {
              slop: 5, // slop
            },
          }),
          TimelinePlugin.create({
            container: "#timeline", // the element in which to place the timeline, or a CSS selector to find it
            formatTimeCallback: formatTimeCallback, // custom time format callback. (Function which receives number of seconds and returns formatted string)
            timeInterval: timeInterval, // number of intervals that records consists of. Usually it is equal to the duration in minutes. (Integer or function which receives pxPerSec value and returns value)
            primaryLabelInterval: primaryLabelInterval, // number of primary time labels. (Integer or function which receives pxPerSec value and reurns value)
            secondaryLabelInterval: secondaryLabelInterval, // number of secondary time labels (Time labels between primary labels, integer or function which receives pxPerSec value and reurns value).
            primaryColor: "blue", // the color of the modulo-ten notch lines (e.g. 10sec, 20sec). The default is '#000'.
            secondaryColor: "blue", // the color of the non-modulo-ten notch lines. The default is '#c0c0c0'.
            primaryFontColor: "#000", // the color of the non-modulo-ten time labels (e.g. 10sec, 20sec). The default is '#000'.
            secondaryFontColor: "#000",
          }),
          CursorPlugin.create({
            wrapper: this.$waveform,
            showTime: true,
            opacity: 1,
          }),
        ],
      };
    }

    this.wavesurfer = WaveSurfer.create(wavesurferConfigure);

    /**
     * Load data
     */
    this.wavesurfer.load(this.props.src);

    /**
     * Speed of waveform
     */
    this.wavesurfer.setPlaybackRate(this.state.speed);

    const self = this;

    if (this.props.regions) {
      /**
       * Mouse enter on region
       */
      this.wavesurfer.on("region-mouseenter", reg => {
        reg._region.onMouseOver();
      });

      /**
       * Mouse leave on region
       */
      this.wavesurfer.on("region-mouseleave", reg => {
        reg._region.onMouseLeave();
      });

      /**
       * Add region to wave
       */
      this.wavesurfer.on("region-created", reg => {
        const region = self.props.addRegion(reg);
        reg._region = region;
        reg.color = region.selectedregionbg;

        reg.on("click", () => region.onClick(self.wavesurfer));
        reg.on("update-end", () => region.onUpdateEnd(self.wavesurfer));

        reg.on("dblclick", e => {
          window.setTimeout(function() {
            reg.play();
          }, 0);
        });

        reg.on("out", () => {});
      });
    }

    /**
     * Handler of slider
     */
    const slider = document.querySelector("#slider");

    if (slider) {
      slider.oninput = function() {
        self.wavesurfer.zoom(Number(this.value));
      };
    }

    this.wavesurfer.on("ready", () => {
      self.props.onCreate(this.wavesurfer);
    });

    /**
     * Pause trigger of audio
     */
    this.wavesurfer.on("pause", self.props.handlePlay);

    /**
     * Play trigger of audio
     */
    this.wavesurfer.on("play", self.props.handlePlay);

    if (this.props.regions) {
      this.props.onLoad(this.wavesurfer);
    }
  }

  render() {
    return (
      <div>
        <div id="wave" className={styles.wave} />

        <div id="timeline" />

        <Row className={this.props.volume || this.props.speed || this.props.zoom ? styles.menu : ""}>
          {this.props.speed && (
            <Col span={24}>
              <Col span={12}>
                Speed:{" "}
                <InputNumber
                  min={0.5}
                  max={3}
                  value={this.state.speed}
                  onChange={value => {
                    this.onChangeSpeed(value);
                  }}
                />
              </Col>
              <Col span={24}>
                <Slider
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={typeof this.state.speed === "number" ? this.state.speed : 1}
                  onChange={range => {
                    this.onChangeSpeed(range);
                  }}
                />
              </Col>
            </Col>
          )}
          {this.props.volume && (
            <Col span={24}>
              <Col span={12}>
                Volume:{" "}
                <InputNumber
                  min={0}
                  max={1}
                  value={this.state.volume}
                  step={0.1}
                  onChange={value => {
                    this.onChangeVolume(value);
                  }}
                />
              </Col>
              <Col span={24}>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={typeof this.state.volume === "number" ? this.state.volume : 1}
                  onChange={value => {
                    this.onChangeVolume(value);
                  }}
                />
              </Col>
            </Col>
          )}
          {this.props.zoom && (
            <Col span={24}>
              <Col span={12}>
                Zoom:{" "}
                <InputNumber
                  min={20}
                  max={500}
                  value={this.state.zoom}
                  onChange={value => {
                    this.onChangeZoom(value);
                  }}
                />
              </Col>
              <Col span={24}>
                <Slider
                  min={20}
                  step={10}
                  max={500}
                  value={typeof this.state.zoom === "number" ? this.state.zoom : 0}
                  onChange={value => {
                    this.onChangeZoom(value);
                  }}
                />
              </Col>
            </Col>
          )}
        </Row>
      </div>
    );
  }
}
