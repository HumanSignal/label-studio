import React, { Component } from "react";
import { FaPause, FaPlay } from "react-icons/fa";
import { Button } from "./Button/Button";
import { Space } from "./Space/Space";

const Duration = ({ value, format }) => {
  const formatted = new Date(value * 1000).toISOString().substr(11, 8);

  const parsed = formatted.split(":");

  const result = format.map((unit) => {
    switch (unit) {
      case "hours":
        return parsed[0];
      case "minutes":
        return parsed[1];
      case "seconds":
        return parsed[2];
    }
  });

  return result.join(":");
};

const PlaybackControl = ({ current, duration, onChange }) => {
  const format = React.useMemo(() => {
    if (duration >= 3600) {
      return ["hours", "minutes", "seconds"];
    }
    return ["minutes", "seconds"];
  }, [duration]);

  return (
    <>
      <Space spread>
        <Duration value={current} format={format} />
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={current}
          style={{ flex: 1 }}
          onChange={(e) => onChange?.(e.target.value)}
        />
        <Duration value={duration} format={format} />
      </Space>
    </>
  );
};

let currentPlayer;

export class SharedAudio extends Component {
  /** @type {string} */
  src = null;

  state = {
    paused: true,
    duration: 0,
    current: 0,
    volume: 0.5,
    audio: null,
    idle: true,
  };

  componentWillUnmount() {
    if (this.audio) this.destroy();
  }

  render() {
    const paused = this.state.paused || this.state.audio === null;

    return (
      <Space size="small" style={{ width: "100%", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
        <Button onClick={paused ? this.play : this.pause}>{paused ? <FaPlay /> : <FaPause />}</Button>

        {this.state.error ? (
          <div>Unable to play</div>
        ) : this.audio ? (
          <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
            <PlaybackControl
              current={this.state.current}
              duration={this.state.duration}
              onChange={(time) => {
                this.audio.currentTime = time;
                if (paused) this.audio.pause();
              }}
            />
          </div>
        ) : null}
      </Space>
    );
  }

  play = () => {
    this.setState({ ...this.state, idle: false });
    this.createAudioElement(() => this.audio.play());
  };

  pause = () => {
    this.createAudioElement(() => this.audio.pause());
  };

  createAudioElement(callback) {
    if (currentPlayer === this) {
      callback();
      return;
    }

    currentPlayer?.destroy();
    currentPlayer = this;

    const audio = new Audio(this.props.src);

    document.body.appendChild(audio);
    audio.classList.add("dm-audio");
    audio.currentTime = 0;
    audio.volume = this.state.volume;

    audio.onpause = () => this.setState({ paused: true });

    audio.onplay = () => this.setState({ paused: false });

    audio.ontimeupdate = () => this.setState({ current: audio.currentTime });

    audio.ondurationchange = () => this.setState({ duration: audio.duration });

    audio.oncanplay = () => {
      this.setState(
        {
          audio,
          duration: audio.duration,
          current: audio.currentTime,
          paused: audio.paused,
        },
        callback,
      );
    };

    audio.onerror = () => {
      this.setState({ error: true });
    };
  }

  destroy() {
    if (this.audio) {
      this.audio.pause();
      this.audio.remove();
      this.audio = null;
    }
  }

  get audio() {
    return this.state.audio;
  }

  /**
   * @param {HTMLAudioElement} value
   */
  set audio(value) {
    this.setState({ audio: value });
  }
}
