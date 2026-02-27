import { types } from "mobx-state-tree";
import { mockFF } from "../../../../../__mocks__/global";
import { FF_DEV_2669, FF_LSDV_E_278 } from "../../../../utils/feature-flags";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ParagraphsModel } from "../model";

const ff = mockFF();

jest.mock("../../../../regions/ParagraphsRegion", () => ({}));

const MockStore = types
  .model({
    paragraphs: ParagraphsModel,
  })
  .volatile(() => ({
    task: { dataObj: {} },
    annotationStore: { addErrors: jest.fn() },
  }));

const phrases = [
  {
    author: "Cheshire Cat",
    text: "You must be, or you wouldn't have come here.",
    start: 6,
  },
  {
    author: "Cheshire Cat",
    text: "We're all mad here. I'm mad. You're mad.",
    start: 1.2,
    end: 4.1, // overlapping with the next phrase
  },
  {
    // just a phrase with no timing
    author: "Lewis Carroll",
    text: "<cat is smiling>",
  },
  {
    author: "Alice",
    text: "How do you know I'm mad?",
    start: 3.2,
    duration: 1.5,
  },
];

ff.setup();
ff.set({
  [FF_LSDV_E_278]: true,
});

describe("Paragraphs phrases", () => {
  // creating models can be a long one, so all tests will share one model
  const model = ParagraphsModel.create({ name: "phrases", value: "$phrases", contextscroll: true });
  const store = MockStore.create({ paragraphs: model });
  const duration = 10;

  store.task.dataObj = { phrases };
  model.updateValue(store);
  model.handleAudioLoaded({ target: { duration } });

  it("should update value from task", () => {
    expect(model._value).toEqual(phrases);
  });

  it("should calculate phrases times", () => {
    const expected = [
      {
        start: 1.2,
        end: 4.1,
      },
      {
        start: 3.2,
        end: 4.7,
      },
      {
        start: 6,
        end: duration,
      },
      {},
    ];

    expect(model.regionsStartEnd).toEqual(expected);
  });

  it("should detect phrase id by time", () => {
    expect(model.regionIndicesByTime(1)).toEqual([]);
    expect(model.regionIndicesByTime(2)).toEqual([0]);
    expect(model.regionIndicesByTime(3)).toEqual([0]);
    expect(model.regionIndicesByTime(4)).toEqual([0, 1]);
    expect(model.regionIndicesByTime(5)).toEqual([]);
    expect(model.regionIndicesByTime(6)).toEqual([2]);
    expect(model.regionIndicesByTime(7)).toEqual([2]);
  });

  it("should order the phrases by start time", () => {
    expect(model._value.map((p: { author: string }) => p.author)).toEqual([
      phrases[0].author,
      phrases[1].author,
      phrases[2].author,
      phrases[3].author,
    ]);
  });

  it("should return layoutClasses for layout none", () => {
    const noLayout = ParagraphsModel.create({ name: "p", value: "$phrases", layout: "none" });
    const s = MockStore.create({ paragraphs: noLayout });
    s.task.dataObj = { phrases: [{ author: "A", text: "T" }] };
    noLayout.updateValue(s);
    expect(noLayout.layoutClasses).toEqual({
      phrase: expect.any(String),
      name: expect.any(String),
      text: expect.any(String),
    });
  });

  it("should return layoutStyles for layout none as empty object", () => {
    const noLayout = ParagraphsModel.create({ name: "p", value: "$phrases", layout: "none" });
    const s = MockStore.create({ paragraphs: noLayout });
    s.task.dataObj = { phrases: [{ author: "A", text: "T" }] };
    noLayout.updateValue(s);
    expect(noLayout.layoutStyles({ author: "A", text: "t" })).toEqual({});
  });

  it("should return layoutStyles for dialogue when FF_LSDV_E_278 is false", () => {
    ff.set({ [FF_LSDV_E_278]: false });
    const dialogueModel = ParagraphsModel.create({
      name: "p",
      value: "$phrases",
      layout: "dialogue",
    });
    const s = MockStore.create({ paragraphs: dialogueModel });
    s.task.dataObj = { phrases: [{ author: "Alice", text: "Hi" }] };
    dialogueModel.updateValue(s);
    const styles = dialogueModel.layoutStyles({ author: "Alice", text: "Hi" });
    expect(styles).toHaveProperty("phrase");
    expect(styles.phrase).toHaveProperty("backgroundColor");
    ff.set({ [FF_LSDV_E_278]: true });
  });

  it("should return layoutStyles for dialogue when FF_LSDV_E_278 is true", () => {
    const dialogueModel = ParagraphsModel.create({
      name: "p",
      value: "$phrases",
      layout: "dialogue",
    });
    const s = MockStore.create({ paragraphs: dialogueModel });
    s.task.dataObj = { phrases: [{ author: "Alice", text: "Hi" }] };
    dialogueModel.updateValue(s);
    const styles = dialogueModel.layoutStyles({ author: "Alice", text: "Hi" });
    expect(styles).toHaveProperty("phrase");
    expect(styles.phrase).toHaveProperty("--highlight-color");
    expect(styles).toHaveProperty("inactive");
  });

  it("should return layoutClasses for layout dialogue", () => {
    const dialogueModel = ParagraphsModel.create({
      name: "p",
      value: "$phrases",
      layout: "dialogue",
    });
    const s = MockStore.create({ paragraphs: dialogueModel });
    s.task.dataObj = { phrases: [{ author: "A", text: "T" }] };
    dialogueModel.updateValue(s);
    expect(dialogueModel.layoutClasses).toEqual({
      phrase: expect.any(String),
      name: expect.any(String),
      text: expect.any(String),
    });
    expect(dialogueModel.layoutClasses.name).toBeTruthy();
  });

  it("should reset playingId and clear audioFrameHandler", () => {
    model.seekToPhrase(0);
    model.reset();
    expect(model.playingId).toBe(-1);
  });

  it("should call selectPhraseText on view ref", () => {
    const mockSelect = jest.fn();
    model.setViewRef({ selectText: mockSelect });
    model.selectPhraseText(0);
    expect(mockSelect).toHaveBeenCalledWith(0);
  });

  it("should call selectAndAnnotatePhrase on view ref", () => {
    const mockSelect = jest.fn();
    const mockCreate = jest.fn();
    model.setViewRef({
      selectText: mockSelect,
      createAnnotationForPhrase: mockCreate,
    });
    model.selectAndAnnotatePhrase(2);
    expect(mockSelect).toHaveBeenCalledWith(2);
    expect(mockCreate).toHaveBeenCalledWith(2);
  });

  it("should return true from isVisibleForAuthorFilter when FF_DEV_2669 is off", () => {
    ff.set({ [FF_DEV_2669]: false });
    expect(model.isVisibleForAuthorFilter({ author: "Anyone", text: "x" })).toBe(true);
    ff.set({ [FF_DEV_2669]: true });
  });

  it("should filter by author when FF_DEV_2669 is on and filterByAuthor is set", () => {
    ff.set({ [FF_DEV_2669]: true });
    model.setAuthorFilter(["Alice"]);
    expect(model.isVisibleForAuthorFilter({ author: "Alice", text: "x" })).toBe(true);
    expect(model.isVisibleForAuthorFilter({ author: "Bob", text: "y" })).toBe(false);
    model.setAuthorFilter([]);
    expect(model.isVisibleForAuthorFilter({ author: "Bob", text: "y" })).toBe(true);
    ff.set({ [FF_DEV_2669]: true });
  });

  it("should call addErrors when updateValue valuetype is url and URL is invalid", () => {
    const urlModel = ParagraphsModel.create({
      name: "p",
      value: "$url",
      valuetype: "url",
    });
    const s = MockStore.create({ paragraphs: urlModel });
    s.task.dataObj = { url: "" };
    urlModel.updateValue(s);
    expect(s.annotationStore.addErrors).toHaveBeenCalled();
  });

  it("should load and set value from url when updateValue valuetype is url", async () => {
    const urlModel = ParagraphsModel.create({
      name: "p",
      value: "$url",
      valuetype: "url",
    });
    const s = MockStore.create({ paragraphs: urlModel });
    const data = [{ author: "A", text: "T" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });
    s.task.dataObj = { url: "https://example.com/data.json" };
    urlModel.updateValue(s);
    await new Promise((r) => setTimeout(r, 0));
    expect(urlModel._value).toEqual(data);
  });

  it("should call addErrors when fetch fails for valuetype url", async () => {
    const urlModel = ParagraphsModel.create({
      name: "p",
      value: "$url",
      valuetype: "url",
    });
    const s = MockStore.create({ paragraphs: urlModel });
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    s.task.dataObj = { url: "https://example.com/data.json" };
    urlModel.updateValue(s);
    await new Promise((r) => setTimeout(r, 0));
    expect(s.annotationStore.addErrors).toHaveBeenCalled();
  });

  it("should call addErrors when fetch returns not ok for valuetype url", async () => {
    const urlModel = ParagraphsModel.create({
      name: "p",
      value: "$url",
      valuetype: "url",
    });
    const s = MockStore.create({ paragraphs: urlModel });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    s.task.dataObj = { url: "https://example.com/data.json" };
    urlModel.updateValue(s);
    await new Promise((r) => setTimeout(r, 0));
    expect(s.annotationStore.addErrors).toHaveBeenCalled();
  });

  it("should expose audio getter from task when audiourl is $key", () => {
    const withAudio = ParagraphsModel.create({
      name: "p",
      value: "$phrases",
      audiourl: "$audioUrl",
    });
    const s = MockStore.create({ paragraphs: withAudio });
    s.task.dataObj = {
      phrases: [{ author: "A", text: "T" }],
      audioUrl: "https://example.com/audio.wav",
    };
    withAudio.updateValue(s);
    expect(withAudio.audio).toBe("https://example.com/audio.wav");
  });

  it("should expose audio getter as direct url when audiourl does not start with $", () => {
    const withAudio = ParagraphsModel.create({
      name: "p",
      value: "$phrases",
      audiourl: "https://example.com/direct.wav",
    });
    const s = MockStore.create({ paragraphs: withAudio });
    s.task.dataObj = { phrases: [{ author: "A", text: "T" }] };
    withAudio.updateValue(s);
    expect(withAudio.audio).toBe("https://example.com/direct.wav");
  });

  it("should return null audio when audiourl is null", () => {
    const noAudio = ParagraphsModel.create({ name: "p", value: "$phrases" });
    const s = MockStore.create({ paragraphs: noAudio });
    s.task.dataObj = { phrases: [{ author: "A", text: "T" }] };
    noAudio.updateValue(s);
    expect(noAudio.audio).toBeNull();
  });

  it("should call addErrors when setRemoteValue receives non-array", () => {
    const m = ParagraphsModel.create({ name: "p", value: "$data" });
    const s = MockStore.create({ paragraphs: m });
    s.task.dataObj = { data: "not an array" };
    m.updateValue(s);
    expect(s.annotationStore.addErrors).toHaveBeenCalled();
  });

  it("should call addErrors when setRemoteValue array is missing nameKey field", () => {
    const m = ParagraphsModel.create({ name: "p", value: "$data", namekey: "author" });
    const s = MockStore.create({ paragraphs: m });
    s.task.dataObj = { data: [{ text: "only text" }] };
    m.updateValue(s);
    expect(s.annotationStore.addErrors).toHaveBeenCalled();
  });

  it("should call addErrors when setRemoteValue array is missing textKey field", () => {
    const m = ParagraphsModel.create({ name: "p", value: "$data", textkey: "text" });
    const s = MockStore.create({ paragraphs: m });
    s.task.dataObj = { data: [{ author: "A" }] };
    m.updateValue(s);
    expect(s.annotationStore.addErrors).toHaveBeenCalled();
  });

  it("should update searchAuthor and filterByAuthor", () => {
    model.setAuthorSearch("Alice");
    expect(model.searchAuthor).toBe("Alice");
    model.setAuthorFilter(["Alice", "Bob"]);
    expect(model.filterByAuthor).toEqual(["Alice", "Bob"]);
  });

  it("should seekToPhrase and update playingId when phrase has no start", () => {
    model.seekToPhrase(2);
    expect(model.playingId).toBe(2);
  });

  it("should not seekToPhrase when idx equals playingId", () => {
    model.seekToPhrase(1);
    model.seekToPhrase(1);
    expect(model.playingId).toBe(1);
  });

  it("should not seekToPhrase when idx is out of range", () => {
    model.seekToPhrase(0);
    model.seekToPhrase(99);
    expect(model.playingId).toBe(0);
    model.seekToPhrase(-1);
    expect(model.playingId).toBe(0);
  });

  it("should goToNextPhrase wrap to first after last", () => {
    model.seekToPhrase(3);
    model.goToNextPhrase();
    expect(model.playingId).toBe(0);
  });

  it("should goToPreviousPhrase wrap to last when at first", () => {
    model.seekToPhrase(0);
    model.goToPreviousPhrase();
    expect(model.playingId).toBe(3);
  });

  it("should goToNextPhrase from -1 start at 0", () => {
    const freshModel = ParagraphsModel.create({ name: "p2", value: "$phrases" });
    const s2 = MockStore.create({ paragraphs: freshModel });
    s2.task.dataObj = { phrases };
    freshModel.updateValue(s2);
    freshModel.goToNextPhrase();
    expect(freshModel.playingId).toBe(0);
  });

  it("should selectAllAndAnnotateCurrentPhrase when _value is set", () => {
    const mockSelect = jest.fn();
    const mockCreate = jest.fn();
    model.setViewRef({
      selectText: mockSelect,
      createAnnotationForPhrase: mockCreate,
    });
    model.seekToPhrase(1);
    model.selectAllAndAnnotateCurrentPhrase();
    expect(mockSelect).toHaveBeenCalledWith(1);
    expect(mockCreate).toHaveBeenCalledWith(1);
  });

  it("should not selectAllAndAnnotateCurrentPhrase when _value is empty", () => {
    const emptyModel = ParagraphsModel.create({ name: "p", value: "$x" });
    const s = MockStore.create({ paragraphs: emptyModel });
    s.task.dataObj = { x: "not an array" };
    emptyModel.updateValue(s);
    const mockSelect = jest.fn();
    emptyModel.setViewRef({ selectText: mockSelect, createAnnotationForPhrase: jest.fn() });
    emptyModel.selectAllAndAnnotateCurrentPhrase();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("should increment _update on needsUpdate", () => {
    const m = ParagraphsModel.create({ name: "p", value: "$x" });
    const s = MockStore.create({ paragraphs: m });
    s.task.dataObj = { x: [{ author: "A", text: "T" }] };
    m.updateValue(s);
    const before = m._update;
    m.needsUpdate();
    expect(m._update).toBe(before + 1);
  });

  it("should return empty regionsStartEnd when audioDuration is not set", () => {
    const noDuration = ParagraphsModel.create({ name: "p", value: "$phrases" });
    const s = MockStore.create({ paragraphs: noDuration });
    s.task.dataObj = { phrases };
    noDuration.updateValue(s);
    expect(noDuration.regionsStartEnd).toEqual([]);
  });

  it("should call stopNow and pause audio when audioRef.current is set", () => {
    const mockAudio = { paused: false, currentTime: 0, pause: jest.fn(), play: jest.fn() };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    model.stopNow();
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(model.playing).toBe(false);
  });

  it("should call syncSend via triggerSync when stopNow is called with audio and syncSend set", () => {
    const mockAudio = { paused: false, currentTime: 2, pause: jest.fn(), play: jest.fn() };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    const syncSend = jest.fn();
    (model as { syncSend?: (d: unknown, e: string) => void }).syncSend = syncSend;
    model.stopNow();
    expect(syncSend).toHaveBeenCalledWith(expect.objectContaining({ time: 2 }), "pause");
  });

  it("should not call pause in stopNow when audio is already paused", () => {
    const mockAudio = { paused: true, currentTime: 0, pause: jest.fn() };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    model.stopNow();
    expect(mockAudio.pause).not.toHaveBeenCalled();
  });

  it("should call handleSyncSpeed and set playbackRate on audio", () => {
    const mockAudio = { playbackRate: 1, play: jest.fn(), pause: jest.fn() };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    model.handleSyncSpeed({ speed: 1.5 });
    expect(mockAudio.playbackRate).toBe(1.5);
  });

  it("should call syncMuted and set muted on audio", () => {
    const mockAudio = { muted: false, play: jest.fn(), pause: jest.fn() };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    model.syncMuted(true);
    expect(mockAudio.muted).toBe(true);
  });

  it("should play and triggerSync when playAny is called with paused audio", () => {
    const mockAudio = {
      paused: true,
      currentTime: 0,
      duration: 10,
      play: jest.fn(),
      pause: jest.fn(),
    };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    const syncSend = jest.fn();
    (model as { syncSend?: (data: unknown, event: string) => void }).syncSend = syncSend;
    model.playAny();
    expect(mockAudio.play).toHaveBeenCalled();
    expect(syncSend).toHaveBeenCalledWith(expect.any(Object), "play");
  });

  it("should play(idx) and set playingId and currentTime when audio and region exist", () => {
    const mockAudio = {
      paused: true,
      currentTime: 0,
      duration: 10,
      play: jest.fn(),
      pause: jest.fn(),
    };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    (model as { syncSend?: (data: unknown, event: string) => void }).syncSend = jest.fn();
    model.handleAudioLoaded({ target: { duration: 10 } });
    model.play(0);
    expect(mockAudio.currentTime).toBe(1.2);
    expect(mockAudio.play).toHaveBeenCalled();
    expect(model.playingId).toBe(0);
  });

  it("should seekToPhrase set audio.currentTime when phrase has start and no syncSend", () => {
    const mockAudio = {
      paused: true,
      currentTime: 0,
      duration: 10,
      play: jest.fn(),
      pause: jest.fn(),
    };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    (model as { syncSend?: unknown }).syncSend = undefined;
    model.seekToPhrase(1);
    expect(model.playingId).toBe(1);
    expect(mockAudio.currentTime).toBe(3.2);
  });

  it("should seekToPhrase call syncSend when phrase has start and syncSend is set", () => {
    const syncSend = jest.fn();
    (model as { syncSend?: (d: unknown, e: string) => void }).syncSend = syncSend;
    model.seekToPhrase(0);
    expect(model.playingId).toBe(0);
    expect(syncSend).toHaveBeenCalledWith({ time: 1.2, playing: false }, "seek");
  });

  it("should registerSyncHandlers set pause, play, seek, speed on syncHandlers", () => {
    model.registerSyncHandlers();
    expect(model.syncHandlers.get("pause")).toBeDefined();
    expect(model.syncHandlers.get("play")).toBe(model.handleSyncPlay);
    expect(model.syncHandlers.get("seek")).toBe(model.handleSyncPlay);
    expect(model.syncHandlers.get("speed")).toBe(model.handleSyncSpeed);
  });

  it("handleSyncPlay sets currentTime and can trigger play when audio exists", () => {
    const mockAudio = {
      paused: true,
      currentTime: 0,
      duration: 10,
      play: jest.fn(),
      pause: jest.fn(),
    };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    (model as { syncSend?: (d: unknown, e: string) => void }).syncSend = jest.fn();
    model.handleSyncPlay({ time: 2, playing: true }, "play");
    expect(mockAudio.currentTime).toBe(2);
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("handleSyncPause calls stopNow when audio exists", () => {
    const mockAudio = { paused: false, currentTime: 1, pause: jest.fn(), play: jest.fn() };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    (model as { syncSend?: (d: unknown, e: string) => void }).syncSend = jest.fn();
    model.handleSyncPause({ playing: false }, "pause");
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it("should stopAtTheEnd call stopNow and reset when currentTime reaches region end", () => {
    let rafCallback: (() => void) | null = null;
    const rafSpy = jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: (n: number) => void) => {
      rafCallback = () => cb(0);
      return 1;
    });
    const mockAudio = {
      get paused() {
        return this._paused;
      },
      set paused(v: boolean) {
        this._paused = v;
      },
      _paused: false,
      get currentTime() {
        return this._currentTime;
      },
      set currentTime(v: number) {
        this._currentTime = v;
      },
      _currentTime: 4.5,
      duration: 10,
      play: jest.fn(),
      pause: jest.fn(function (this: { _paused: boolean }) {
        this._paused = true;
      }),
    };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    (model as { syncSend?: (d: unknown, e: string) => void }).syncSend = jest.fn();
    model.handleAudioLoaded({ target: { duration: 10 } });
    model.seekToPhrase(1);
    model.stopAtTheEnd();
    expect(rafCallback).not.toBeNull();
    mockAudio._currentTime = 5;
    rafCallback!();
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(model.playingId).toBe(-1);
    rafSpy.mockRestore();
  });

  it("play(idx) should stop when already playing same idx", () => {
    const mockAudio = {
      paused: false,
      currentTime: 1.5,
      duration: 10,
      play: jest.fn(),
      pause: jest.fn(),
    };
    model.audioRef.current = mockAudio as unknown as HTMLAudioElement;
    (model as { syncSend?: (d: unknown, e: string) => void }).syncSend = jest.fn();
    model.handleAudioLoaded({ target: { duration: 10 } });
    model.play(0);
    model.play(0);
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it("addRegion returns undefined when getAvailableStates is empty", () => {
    const m = ParagraphsModel.create({ name: "p", value: "$x" });
    const s = MockStore.create({ paragraphs: m });
    s.task.dataObj = { x: [{ author: "A", text: "T" }] };
    m.updateValue(s);
    s.annotationStore.selected = {
      toNames: new Map([["p", []]]),
      unselectAll: jest.fn(),
    };
    const result = m.addRegion({ text: "hi", _range: {} });
    expect(result).toBeUndefined();
  });

  it("hasStates and states return control when selected has toNames for this model name", () => {
    const control = {
      valueType: "paragraphlabels",
      selectedValues: () => ["L1"],
      isSelected: true,
      _type: "paragraphlabels",
    };
    store.annotationStore.selected = {
      toNames: new Map([["phrases", [control]]]),
      createResult: jest.fn(),
      unselectAll: jest.fn(),
    };
    expect(model.hasStates).toBe(true);
    expect(model.states()).toEqual([control]);
    expect(model.activeStates()).toEqual([control]);
  });

  it("hasStates is false when states is empty", () => {
    store.annotationStore.selected = {
      toNames: new Map([["phrases", []]]),
      unselectAll: jest.fn(),
    };
    expect(model.hasStates).toBe(false);
  });

  it("addRegion creates area via annotation.createResult when store has selected with toNames and control", () => {
    const mockArea = {
      setText: jest.fn(),
      notifyDrawingFinished: jest.fn(),
      _range: null as unknown,
    };
    const control = {
      valueType: "paragraphlabels",
      selectedValues: () => ["Label1"],
      isSelected: true,
      _type: "paragraphlabels",
    };
    const createResult = jest.fn(() => mockArea);
    store.annotationStore.selected = {
      toNames: new Map([["phrases", [control]]]),
      createResult,
      unselectAll: jest.fn(),
    };
    const range = { text: "hello", _range: {} };
    const result = model.addRegion(range);
    expect(createResult).toHaveBeenCalled();
    expect(result).toBe(mockArea);
    expect(mockArea.setText).toHaveBeenCalledWith("hello");
    expect(mockArea.notifyDrawingFinished).toHaveBeenCalled();
    expect(mockArea._range).toBe(range._range);
  });

  it("addRegions creates areas for each range when getAvailableStates returns controls", () => {
    const mockArea1 = {
      setText: jest.fn(),
      notifyDrawingFinished: jest.fn(),
      _range: null as unknown,
    };
    const mockArea2 = {
      setText: jest.fn(),
      notifyDrawingFinished: jest.fn(),
      _range: null as unknown,
    };
    const control = {
      valueType: "paragraphlabels",
      selectedValues: () => ["L1"],
      isSelected: true,
      _type: "paragraphlabels",
    };
    const createResult = jest.fn().mockReturnValueOnce(mockArea1).mockReturnValueOnce(mockArea2);
    store.annotationStore.selected = {
      toNames: new Map([["phrases", [control]]]),
      createResult,
    };
    const ranges = [
      { text: "a", _range: {} },
      { text: "b", _range: {} },
    ];
    const areas = model.addRegions(ranges);
    expect(areas).toHaveLength(2);
    expect(areas[0]).toBe(mockArea1);
    expect(areas[1]).toBe(mockArea2);
    expect(mockArea1.setText).toHaveBeenCalledWith("a");
    expect(mockArea2.setText).toHaveBeenCalledWith("b");
  });

  it("addRegions returns without creating when getAvailableStates is empty", () => {
    store.annotationStore.selected = {
      toNames: new Map([["phrases", []]]),
      createResult: jest.fn(),
      unselectAll: jest.fn(),
    };
    const areas = model.addRegions([{ text: "x", _range: {} }]);
    expect(areas).toBeUndefined();
  });

  it("regionIndicesByTime includes index when duration is undefined and end is undefined", () => {
    const m = ParagraphsModel.create({ name: "p", value: "$phrases" });
    const s = MockStore.create({ paragraphs: m });
    const data = [
      { author: "A", text: "T1", start: 0 },
      { author: "B", text: "T2", start: 1 },
    ];
    s.task.dataObj = { phrases: data };
    m.updateValue(s);
    expect(m.regionIndicesByTime(0.5)).toEqual([0]);
    expect(m.regionIndicesByTime(1.5)).toEqual([0, 1]);
  });

  ff.reset();
});
