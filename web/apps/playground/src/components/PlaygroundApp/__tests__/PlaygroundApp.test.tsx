import { render, waitFor } from "@testing-library/react";
import { PlaygroundApp } from "../PlaygroundApp";
import { useAtom, useSetAtom } from "jotai";
import { configAtom, errorAtom, loadingAtom } from "../../../atoms/configAtoms";

// Mock CodeEditor and allow it to be spied on
jest.mock("../../EditorPanel", () => ({
  EditorPanel: () => <div>EditorPanel</div>,
}));
jest.mock("../../PreviewPanel", () => ({
  PreviewPanel: () => <div>PreviewPanel</div>,
}));
jest.mock("@humansignal/ui", () => ({
  ...jest.requireActual("@humansignal/ui"),
  ThemeToggle: () => <div>ThemeToggle</div>,
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({
    show: jest.fn(),
  }),
}));

// Mock the atoms
jest.mock("jotai", () => {
  const originalModule = jest.requireActual("jotai");
  return {
    ...originalModule,
    useAtom: jest.fn(),
    useSetAtom: jest.fn(),
  };
});

// Mock the fetch function
global.fetch = jest.fn();

function removeAllSpaceLikeCharacters(str: string): string {
  return str
    .replace(/\s+/g, "") // Replace all whitespace characters with empty string
    .replace(/·/g, ""); // Remove the special middle dot character
}

describe("PlaygroundApp", () => {
  const mockSetConfig = jest.fn();
  const mockSetError = jest.fn();
  const mockSetLoading = jest.fn();
  const mockSetInterfaces = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtom as jest.Mock).mockImplementation((atom) => {
      if (atom === configAtom) return ["", mockSetConfig];
      if (atom === errorAtom) return ["", mockSetError];
      if (atom === loadingAtom) return [false, mockSetLoading];
      return [null, mockSetInterfaces];
    });
    (useSetAtom as jest.Mock).mockImplementation((atom) => {
      if (atom === configAtom) return (c: string) => mockSetConfig(removeAllSpaceLikeCharacters(c));
      if (atom === errorAtom) return mockSetError;
      if (atom === loadingAtom) return mockSetLoading;
      return mockSetInterfaces;
    });

    // Reset window.location to default
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost"),
      writable: true,
      configurable: true,
    });
  });

  it("should handle config parameter in URL", async () => {
    // Mock URL with config parameter
    const mockConfig = '<View><Text name="text" value="$text"/></View>';
    const encodedConfig = encodeURIComponent(mockConfig.replace(/\n/g, "<br>"));
    Object.defineProperty(window, "location", {
      value: new URL(`http://localhost?config=${encodedConfig}`),
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetConfig).toHaveBeenCalledWith(removeAllSpaceLikeCharacters(mockConfig));
      expect(mockSetError).not.toHaveBeenCalled();
    });
  });

  it("should handle invalid config parameter", async () => {
    // Mock URL with invalid config parameter that will cause decodeURIComponent to fail
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?config=invalid%2"), // %2 is an incomplete percent encoding
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        "Failed to decode config. Are you sure it's a valid urlencoded string?",
      );
    });
  });

  it("should handle configUrl parameter", async () => {
    // Mock URL with configUrl parameter
    const mockConfig = '<View><Text name="text" value="$text"/></View>';
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?configUrl=http://example.com/config.xml"),
      writable: true,
      configurable: true,
    });

    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockConfig),
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetConfig).toHaveBeenCalledWith(removeAllSpaceLikeCharacters(mockConfig));
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it("should handle failed configUrl fetch", async () => {
    // Mock URL with configUrl parameter
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?configUrl=http://example.com/config.xml"),
      writable: true,
      configurable: true,
    });

    // Mock failed fetch response
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Failed to fetch"));

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("Failed to fetch config from URL.");
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it("should handle non-200 configUrl response", async () => {
    // Mock URL with configUrl parameter
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?configUrl=http://example.com/config.xml"),
      writable: true,
      configurable: true,
    });

    // Mock non-200 fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("Failed to fetch config from URL.");
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it("should handle interfaces parameter", async () => {
    // Mock URL with interfaces parameter
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost?interfaces=skip,submit"),
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetInterfaces).toHaveBeenCalledWith(["skip", "submit"]);
    });
  });

  describe("PlaygroundApp: Loads configs from v1 URL", () => {
    it.each([
      {
        name: "Annotation templates: Audio regions labeling",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Listen%20to%20the%20audio%22%2F%3E%3Cbr%3E%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24audio%22%2F%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Select%20its%20topic%22%2F%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22topic%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20choice%3D%22single-radio%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Politics%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Business%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Education%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Other%22%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Header value=\"Listen to the audio\"/>
      <Audio name=\"audio\" value=\"$audio\"/>
      <Header value=\"Select its topic\"/>
      <Choices name=\"topic\" toName=\"audio\"
               choice=\"single-radio\" showInline=\"true\">
        <Choice value=\"Politics\"/>
        <Choice value=\"Business\"/>
        <Choice value=\"Education\"/>
        <Choice value=\"Other\"/>
      </Choices>
    </View>`,
      },
      {
        name: "Annotation templates: Emotion segmentation",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CLabels%20name%3D%22emotion%22%20toName%3D%22audio%22%20choice%3D%22multiple%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Fear%22%20background%3D%22%23ff0000%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Anger%22%20background%3D%22%23d50000%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Sadness%22%20background%3D%22%235050ff%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Joy%22%20background%3D%22%23ffff53%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Disgust%22%20background%3D%22%23ff53ff%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Surprise%22%20background%3D%22%2358beff%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Trust%22%20background%3D%22%23009700%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Anticipation%22%20background%3D%22%23ffa953%22%20%2F%3E%3Cbr%3E%20%20%3C%2FLabels%3E%3Cbr%3E%3Cbr%3E%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24audio%22%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Labels name=\"emotion\" toName=\"audio\" choice=\"multiple\">
        <Label value=\"Fear\" background=\"#ff0000\" />
        <Label value=\"Anger\" background=\"#d50000\" />
        <Label value=\"Sadness\" background=\"#5050ff\" />
        <Label value=\"Joy\" background=\"#ffff53\" />
        <Label value=\"Disgust\" background=\"#ff53ff\" />
        <Label value=\"Surprise\" background=\"#58beff\" />
        <Label value=\"Trust\" background=\"#009700\" />
        <Label value=\"Anticipation\" background=\"#ffa953\" />
      </Labels>·
      <Audio name=\"audio\" value=\"$audio\"/>
    </View>`,
      },
      {
        name: "Annotation templates: Speaker diarization",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22audio%22%20choice%3D%22multiple%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Speaker%201%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Speaker%202%22%20%2F%3E%3Cbr%3E%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24audio%22%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Labels name=\"label\" toName=\"audio\" choice=\"multiple\">
        <Label value=\"Speaker 1\" />
        <Label value=\"Speaker 2\" />
      </Labels>
      <Audio name=\"audio\" value=\"$audio\"/>
    </View>`,
      },
      {
        name: "Annotation templates: Transcription per region",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CLabels%20name%3D%22labels%22%20toName%3D%22audio%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Speaker%201%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Speaker%202%22%20%2F%3E%3Cbr%3E%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24audio%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Provide%20Transcription%22%20%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CTextArea%20name%3D%22transcription%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20rows%3D%222%22%20editable%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%20required%3D%22true%22%20%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Labels name=\"labels\" toName=\"audio\">
        <Label value=\"Speaker 1\" />
        <Label value=\"Speaker 2\" />
      </Labels>
      <Audio name=\"audio\" value=\"$audio\"/>·
      <View visibleWhen=\"region-selected\">
        <Header value=\"Provide Transcription\" />
      </View>·
      <TextArea name=\"transcription\" toName=\"audio\"
                rows=\"2\" editable=\"true\"
                perRegion=\"true\" required=\"true\" />
    </View>`,
      },
      {
        name: "Annotation templates: Transcription whole audio",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Listen%20to%20the%20audio%22%20%2F%3E%3Cbr%3E%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24audio%22%20%2F%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Write%20the%20transcription%22%20%2F%3E%3Cbr%3E%20%20%3CTextArea%20name%3D%22transcription%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20rows%3D%224%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%20%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Header value=\"Listen to the audio\" />
      <Audio name=\"audio\" value=\"$audio\" />
      <Header value=\"Write the transcription\" />
      <TextArea name=\"transcription\" toName=\"audio\"
                rows=\"4\" editable=\"true\" maxSubmissions=\"1\" />
    </View>`,
      },
      {
        name: "Annotation templates: Image classification",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CImage%20name%3D%22image%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22choice%22%20toName%3D%22image%22%20showInLine%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Boeing%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Airbus%22%20background%3D%22green%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Image name=\"image\" value=\"$image\"/>
      <Choices name=\"choice\" toName=\"image\" showInLine=\"true\">
        <Choice value=\"Boeing\" background=\"blue\"/>
        <Choice value=\"Airbus\" background=\"green\" />
      </Choices>
    </View>`,
      },
      {
        name: "Annotation templates: Bbox object detection",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CImage%20name%3D%22image%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%20%20%3CRectangleLabels%20name%3D%22label%22%20toName%3D%22image%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Airplane%22%20background%3D%22green%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Car%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%3C%2FRectangleLabels%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Image name=\"image\" value=\"$image\"/>
      <RectangleLabels name=\"label\" toName=\"image\">
        <Label value=\"Airplane\" background=\"green\"/>
        <Label value=\"Car\" background=\"blue\"/>
      </RectangleLabels>
    </View>`,
      },
      {
        name: "Annotation templates: Brush segmentation",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CImage%20name%3D%22image%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%20%20%3CBrushLabels%20name%3D%22tag%22%20toName%3D%22image%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Planet%22%20background%3D%22rgba(0%2C%200%2C%20255%2C%200.7)%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Moonwalker%22%20background%3D%22rgba(255%2C%200%2C%200%2C%200.7)%22%2F%3E%3Cbr%3E%20%20%3C%2FBrushLabels%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
      <Image name=\"image\" value=\"$image\"/>
      <BrushLabels name=\"tag\" toName=\"image\">
        <Label value=\"Planet\" background=\"rgba(0, 0, 255, 0.7)\"/>
        <Label value=\"Moonwalker\" background=\"rgba(255, 0, 0, 0.7)\"/>
      </BrushLabels>
    </View>`,
      },
      {
        name: "Annotation templates: Circular object detector",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CImage%20name%3D%22image%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%20%20%3CEllipseLabels%20name%3D%22tag%22%20toName%3D%22image%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Airplane%22%20background%3D%22green%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Car%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%3C%2FEllipseLabels%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Image name=\"image\" value=\"$image\"/>
      <EllipseLabels name=\"tag\" toName=\"image\">
        <Label value=\"Airplane\" background=\"green\"/>
        <Label value=\"Car\" background=\"blue\"/>
      </EllipseLabels>
    </View>`,
      },
      {
        name: "Annotation templates: Keypoints and landmarks",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CImage%20name%3D%22image%22%20value%3D%22%24image%22%20zoom%3D%22true%22%20zoomControl%3D%22true%22%2F%3E%3Cbr%3E%20%20%3CKeyPointLabels%20name%3D%22label%22%20toName%3D%22image%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokewidth%3D%222%22%20opacity%3D%221%22%20%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Engine%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Tail%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%3C%2FKeyPointLabels%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Image name=\"image\" value=\"$image\" zoom=\"true\" zoomControl=\"true\"/>
      <KeyPointLabels name=\"label\" toName=\"image\"
                      strokewidth=\"2\" opacity=\"1\" >
          <Label value=\"Engine\" background=\"red\"/>
          <Label value=\"Tail\" background=\"blue\"/>
      </KeyPointLabels>
    </View>`,
      },
      {
        name: "Annotation templates: Polygon segmentation",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Select%20label%20and%20start%20to%20click%20on%20image%22%2F%3E%3Cbr%3E%20%20%3CImage%20name%3D%22image%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CPolygonLabels%20name%3D%22label%22%20toName%3D%22image%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeWidth%3D%223%22%20pointSize%3D%22small%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20opacity%3D%220.9%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Airplane%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Car%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%3C%2FPolygonLabels%3E%3Cbr%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>·
      <Header value=\"Select label and start to click on image\"/>
      <Image name=\"image\" value=\"$image\"/>·
      <PolygonLabels name=\"label\" toName=\"image\"
                     strokeWidth=\"3\" pointSize=\"small\"
                     opacity=\"0.9\">
        <Label value=\"Airplane\" background=\"red\"/>
        <Label value=\"Car\" background=\"blue\"/>
      </PolygonLabels>·
    </View>`,
      },
      {
        name: "Annotation templates: Multi-image classification",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Please%20select%20everything%20you%20see%20on%20the%20image%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A%2049%25%3B%20margin-right%3A%201.99%25%22%3E%3Cbr%3E%20%20%20%20%20%20%3CImage%20name%3D%22img-left%22%20value%3D%22%24image1%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoices%20name%3D%22class-left%22%20toName%3D%22img-left%22%20choice%3D%22multiple%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22People%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Trees%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Animals%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A%2049%25%3B%22%3E%3Cbr%3E%20%20%20%20%20%20%3CImage%20name%3D%22img-right%22%20value%3D%22%24image2%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoices%20name%3D%22class-right%22%20toName%3D%22img-right%22%20choice%3D%22multiple%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Food%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Cars%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Buildings%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Which%20one%20is%20clearer%20to%20you%3F%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22comparison%22%20toName%3D%22img-left%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Left%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Right%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Header value=\"Please select everything you see on the image\" />·
      <View style=\"display: flex;\">
        <View style=\"width: 49%; margin-right: 1.99%\">
          <Image name=\"img-left\" value=\"$image1\"/>
          <Choices name=\"class-left\" toName=\"img-left\" choice=\"multiple\">
            <Choice value=\"People\" />
            <Choice value=\"Trees\" />
            <Choice value=\"Animals\" />
          </Choices>
        </View>·
        <View style=\"width: 49%;\">
          <Image name=\"img-right\" value=\"$image2\"/>
          <Choices name=\"class-right\" toName=\"img-right\" choice=\"multiple\">
            <Choice value=\"Food\" />
            <Choice value=\"Cars\" />
            <Choice value=\"Buildings\" />
          </Choices>
        </View>
      </View>·
      <View>
        <Header value=\"Which one is clearer to you?\" />
        <Choices name=\"comparison\" toName=\"img-left\" showInline=\"true\">
          <Choice value=\"Left\" />
          <Choice value=\"Right\" />
        </Choices>
      </View>
    </View>`,
      },
      {
        name: "Annotation templates: Text classification",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%2F%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22sentiment%22%20toName%3D%22text%22%20choice%3D%22single%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Positive%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Negative%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Neutral%22%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Text name=\"text\" value=\"$text\"/>
      <Choices name=\"sentiment\" toName=\"text\" choice=\"single\">
        <Choice value=\"Positive\"/>
        <Choice value=\"Negative\"/>
        <Choice value=\"Neutral\"/>
      </Choices>
    </View>`,
      },
      {
        name: "Annotation templates: Multi classification",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22sentiment%22%20toName%3D%22text%22%20choice%3D%22multiple%22%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22display%3A%20flex%3B%20justify-content%3A%20space-between%22%3E%3Cbr%3E%20%20%20%20%20%20%3CView%20style%3D%22width%3A%2050%25%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CHeader%20value%3D%22Select%20Topics%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Politics%22%2F%3E%3Cbr%3E%20%20%20%20%09%3CChoice%20value%3D%22Business%22%2F%3E%3Cbr%3E%20%20%20%20%09%3CChoice%20value%3D%22Sport%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%20%20%3CView%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CHeader%20value%3D%22Select%20Moods%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Cheerful%22%2F%3E%3Cbr%3E%20%20%20%20%09%3CChoice%20value%3D%22Melancholy%22%2F%3E%3Cbr%3E%20%20%20%20%09%3CChoice%20value%3D%22Romantic%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Text name=\"text\" value=\"$text\" />·
      <Choices name=\"sentiment\" toName=\"text\" choice=\"multiple\">
        <View style=\"display: flex; justify-content: space-between\">
          <View style=\"width: 50%\">
            <Header value=\"Select Topics\" />
            <Choice value=\"Politics\"/>
                <Choice value=\"Business\"/>
                <Choice value=\"Sport\"/>
          </View>
          <View>
            <Header value=\"Select Moods\" />
            <Choice value=\"Cheerful\"/>
                <Choice value=\"Melancholy\"/>
                <Choice value=\"Romantic\"/>
          </View>
        </View>
      </Choices>·
    </View>`,
      },
      {
        name: "Annotation templates: Named entity recognition",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Person%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Organization%22%20background%3D%22darkorange%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Fact%22%20background%3D%22orange%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Money%22%20background%3D%22green%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Date%22%20background%3D%22darkblue%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Time%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Ordinal%22%20background%3D%22purple%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Percent%22%20background%3D%22%23842%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Product%22%20background%3D%22%23428%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Language%22%20background%3D%22%23482%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Location%22%20background%3D%22rgba(0%2C0%2C0%2C0.8)%22%2F%3E%3Cbr%3E%20%20%3C%2FLabels%3E%3Cbr%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Labels name=\"label\" toName=\"text\">
        <Label value=\"Person\" background=\"red\"/>
        <Label value=\"Organization\" background=\"darkorange\"/>
        <Label value=\"Fact\" background=\"orange\"/>
        <Label value=\"Money\" background=\"green\"/>
        <Label value=\"Date\" background=\"darkblue\"/>
        <Label value=\"Time\" background=\"blue\"/>
        <Label value=\"Ordinal\" background=\"purple\"/>
        <Label value=\"Percent\" background=\"#842\"/>
        <Label value=\"Product\" background=\"#428\"/>
        <Label value=\"Language\" background=\"#482\"/>
        <Label value=\"Location\" background=\"rgba(0,0,0,0.8)\"/>
      </Labels>·
      <Text name=\"text\" value=\"$text\"/>
    </View>`,
      },
      {
        name: "Annotation templates: Text summarization",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Please%20read%20the%20text%22%20%2F%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Provide%20one%20sentence%20summary%22%20%2F%3E%3Cbr%3E%20%20%3CTextArea%20name%3D%22answer%22%20toName%3D%22text%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20showSubmitButton%3D%22true%22%20maxSubmissions%3D%221%22%20editable%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20required%3D%22true%22%20%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Header value=\"Please read the text\" />
      <Text name=\"text\" value=\"$text\" />·
      <Header value=\"Provide one sentence summary\" />
      <TextArea name=\"answer\" toName=\"text\"
                showSubmitButton=\"true\" maxSubmissions=\"1\" editable=\"true\"
                required=\"true\" />
    </View>`,
      },
      {
        name: "Annotation templates: Word alignment",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20granularity%3D%22word%22%20%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Labels name=\"label\" toName=\"text\">
        <Label value=\"Person\" />
        <Label value=\"Organization\" />
      </Labels>
      <Text name=\"text\" value=\"$text\" granularity=\"word\" />
    </View>`,
      },
      {
        name: "Annotation templates: HTML classification",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22toxicity%22%20toName%3D%22web_page%22%20choice%3D%22multiple%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Toxic%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Severe%20Toxic%22%20background%3D%22brown%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Obsene%22%20background%3D%22green%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Threat%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Insult%22%20background%3D%22orange%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Identity%20Hate%22%20background%3D%22grey%22%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22border%3A%201px%20solid%20%23CCC%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20border-radius%3A%2010px%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20padding%3A%205px%22%3E%3Cbr%3E%20%20%20%20%3CHyperText%20name%3D%22web_page%22%20value%3D%22%24text%22%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Choices name=\"toxicity\" toName=\"web_page\" choice=\"multiple\" showInline=\"true\">
        <Choice value=\"Toxic\" background=\"red\"/>
        <Choice value=\"Severe Toxic\" background=\"brown\"/>
        <Choice value=\"Obsene\" background=\"green\"/>
        <Choice value=\"Threat\" background=\"blue\"/>
        <Choice value=\"Insult\" background=\"orange\"/>
        <Choice value=\"Identity Hate\" background=\"grey\"/>
      </Choices>·
      <View style=\"border: 1px solid #CCC;
                   border-radius: 10px;
                   padding: 5px\">
        <HyperText name=\"web_page\" value=\"$text\"/>
      </View>
    </View>`,
      },
      {
        name: "Annotation templates: HTML NER tagging",
        url: "https://labelstud.io/playground?config=%3CView%3E%3Cbr%3E%20%20%3CHyperTextLabels%20name%3D%22ner%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Person%22%20background%3D%22green%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Organization%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%3C%2FHyperTextLabels%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22border%3A%201px%20solid%20%23CCC%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20border-radius%3A%2010px%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20padding%3A%205px%22%3E%3Cbr%3E%20%20%20%20%3CHyperText%20name%3D%22text%22%20value%3D%22%24text%22%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <HyperTextLabels name=\"ner\" toName=\"text\">
        <Label value=\"Person\" background=\"green\"/>
        <Label value=\"Organization\" background=\"blue\"/>
      </HyperTextLabels>·
      <View style=\"border: 1px solid #CCC;
                   border-radius: 10px;
                   padding: 5px\">
        <HyperText name=\"text\" value=\"$text\"/>
      </View>
    </View>`,
      },
      {
        name: "Annotation templates: Dialogs & conversations",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CHyperText%20name%3D%22dialog%22%20value%3D%22%24dialogs%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Rate%20last%20answer%22%2F%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22rating%22%20choice%3D%22single-radio%22%20toName%3D%22dialog%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Bad%20answer%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Neutral%20answer%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Good%20answer%22%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Write%20your%20answer%20and%20press%20Enter%22%2F%3E%3Cbr%3E%20%20%3CTextArea%20toName%3D%22dialog%22%20name%3D%22answer%22%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <HyperText name=\"dialog\" value=\"$dialogs\"/>·
      <Header value=\"Rate last answer\"/>
      <Choices name=\"rating\" choice=\"single-radio\" toName=\"dialog\" showInline=\"true\">
        <Choice value=\"Bad answer\"/>
        <Choice value=\"Neutral answer\"/>
        <Choice value=\"Good answer\"/>
      </Choices>·
      <Header value=\"Write your answer and press Enter\"/>
      <TextArea toName=\"dialog\" name=\"answer\"/>
    </View>`,
      },
      {
        name: "Annotation templates: Rate PDF",
        url: "https://localhost?config=%3CView%3E%3Cbr%3E%20%20%3CHyperText%20name%3D%22pdf%22%20value%3D%22%24pdf%22%20inline%3D%22true%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Rate%20this%20article%22%2F%3E%3Cbr%3E%20%20%3CRating%20name%3D%22rating%22%20toName%3D%22pdf%22%20maxRating%3D%2210%22%20icon%3D%22star%22%20size%3D%22medium%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22choices%22%20choice%3D%22single-radio%22%20toName%3D%22pdf%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Important%20article%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Yellow%20press%22%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <HyperText name=\"pdf\" value=\"$pdf\" inline=\"true\"/>·
      <Header value=\"Rate this article\"/>
      <Rating name=\"rating\" toName=\"pdf\" maxRating=\"10\" icon=\"star\" size=\"medium\" />·
      <Choices name=\"choices\" choice=\"single-radio\" toName=\"pdf\" showInline=\"true\">
        <Choice value=\"Important article\"/>
        <Choice value=\"Yellow press\"/>
      </Choices>
    </View>`,
      },
      {
        name: "Annotation templates: Multi-step annotation",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3C!--%20No%20region%20selected%20section%20--%3E%3Cbr%3E%20%20%20%20%3CView%20visibleWhen%3D%22no-region-selected%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20style%3D%22height%3A120px%22%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CHeader%20value%3D%22Create%20and%20select%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20region%20to%20classify%20it%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3C!--%20Control%20tag%20for%20region%20labels%20--%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CTimeSeriesLabels%20name%3D%22label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Region%22%20background%3D%22%235b5%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Region%20selected%20section%20with%20choices%20and%20rating%20--%3E%3Cbr%3E%20%20%20%20%3CView%20visibleWhen%3D%22region-selected%22%20style%3D%22height%3A120px%22%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CHeader%20value%3D%22Now%20select%20the%20signal%20quality%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3C!--%20Per%20region%20Rating%20--%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CRating%20name%3D%22rating%22%20toName%3D%22ts%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20maxRating%3D%2210%22%20icon%3D%22star%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3C!--%20Per%20region%20Choices%20%20--%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoices%20name%3D%22choices%22%20toName%3D%22ts%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20showInline%3D%22true%22%20required%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Good%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Medium%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Poor%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Object%20tag%20for%20time%20series%20data%20source%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20name%3D%22ts%22%20valueType%3D%22url%22%20value%3D%22%24csv%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sep%3D%22%2C%22%20timeColumn%3D%22time%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22signal_1%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%2317b%22%20legend%3D%22Signal%201%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22signal_2%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%23f70%22%20legend%3D%22Signal%202%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
        <!-- No region selected section -->
        <View visibleWhen=\"no-region-selected\"
              style=\"height:120px\">·
            <Header value=\"Create and select
                           region to classify it\"/>·
            <!-- Control tag for region labels -->
            <TimeSeriesLabels name=\"label\" toName=\"ts\">
                <Label value=\"Region\" background=\"#5b5\"/>
            </TimeSeriesLabels>
        </View>·
        <!-- Region selected section with choices and rating -->
        <View visibleWhen=\"region-selected\" style=\"height:120px\">·
            <Header value=\"Now select the signal quality\"/>·
            <!-- Per region Rating -->
            <Rating name=\"rating\" toName=\"ts\"
                    maxRating=\"10\" icon=\"star\"
                    perRegion=\"true\"/>
            <!-- Per region Choices  -->
            <Choices name=\"choices\" toName=\"ts\"
                     showInline=\"true\" required=\"true\"
                     perRegion=\"true\">
                <Choice value=\"Good\"/>
                <Choice value=\"Medium\"/>
                <Choice value=\"Poor\"/>
            </Choices>
        </View>·
        <!-- Object tag for time series data source -->
        <TimeSeries name=\"ts\" valueType=\"url\" value=\"$csv\"
                    sep=\",\" timeColumn=\"time\">
            <Channel column=\"signal_1\"
                     strokeColor=\"#17b\" legend=\"Signal 1\"/>
            <Channel column=\"signal_2\"
                     strokeColor=\"#f70\" legend=\"Signal 2\"/>
        </TimeSeries>
    </View>`,
      },
      {
        name: "Annotation templates: Segmentation extended",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Time%20Series%20Segmentation%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Control%20tag%20for%20region%20labels%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeriesLabels%20name%3D%22label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Run%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Walk%22%20background%3D%22green%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Fly%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Swim%22%20background%3D%22%23f6a%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Ride%22%20background%3D%22%23351%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Object%20tag%20for%20time%20series%20data%20source%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20name%3D%22ts%22%20valueType%3D%22url%22%20value%3D%22%24csv%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sep%3D%22%2C%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20timeColumn%3D%22time%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20timeFormat%3D%22%25Y-%25m-%25d%20%25H%3A%25M%3A%25S.%25f%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20timeDisplayFormat%3D%22%25Y-%25m-%25d%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20overviewChannels%3D%22velocity%22%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22velocity%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20units%3D%22miles%2Fh%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20displayFormat%3D%22%2C.1f%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%231f77b4%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20legend%3D%22Velocity%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22acceleration%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20units%3D%22miles%2Fh%5E2%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20displayFormat%3D%22%2C.1f%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%23ff7f0e%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20legend%3D%22Acceleration%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
        <Header value=\"Time Series Segmentation\"/>·
        <!-- Control tag for region labels -->
        <TimeSeriesLabels name=\"label\" toName=\"ts\">
            <Label value=\"Run\" background=\"red\"/>
            <Label value=\"Walk\" background=\"green\"/>
            <Label value=\"Fly\" background=\"blue\"/>
            <Label value=\"Swim\" background=\"#f6a\"/>
            <Label value=\"Ride\" background=\"#351\"/>
        </TimeSeriesLabels>·
        <!-- Object tag for time series data source -->
        <TimeSeries name=\"ts\" valueType=\"url\" value=\"$csv\"
                    sep=\",\"
                    timeColumn=\"time\"
                    timeFormat=\"%Y-%m-%d %H:%M:%S.%f\"
                    timeDisplayFormat=\"%Y-%m-%d\"
                    overviewChannels=\"velocity\">·
            <Channel column=\"velocity\"
                     units=\"miles/h\"
                     displayFormat=\",.1f\"
                     strokeColor=\"#1f77b4\"
                     legend=\"Velocity\"/>·
            <Channel column=\"acceleration\"
                     units=\"miles/h^2\"
                     displayFormat=\",.1f\"
                     strokeColor=\"#ff7f0e\"
                     legend=\"Acceleration\"/>
        </TimeSeries>
    </View>`,
      },
      {
        name: "Annotation templates: Import JSON",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Time%20Series%20from%20JSON%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20style%3D%22font-weight%3A%20normal%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CTimeSeriesLabels%20name%3D%22label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Anomaly%22%20background%3D%22%23a4a%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Ordinary%22%20background%3D%22%23aa4%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20timeColumn%3D%22time%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20name%3D%22ts%22%20value%3D%22%24ts%22%20valueType%3D%22json%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22first_column%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%231f77b4%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22second_column%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%23ff7f0e%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
        <Header value=\"Time Series from JSON\"
                style=\"font-weight: normal\"/>·
        <TimeSeriesLabels name=\"label\" toName=\"ts\">
            <Label value=\"Anomaly\" background=\"#a4a\"/>
            <Label value=\"Ordinary\" background=\"#aa4\"/>
        </TimeSeriesLabels>·
        <TimeSeries timeColumn=\"time\"
                    name=\"ts\" value=\"$ts\" valueType=\"json\">
            <Channel column=\"first_column\"
                     strokeColor=\"#1f77b4\"/>
            <Channel column=\"second_column\"
                     strokeColor=\"#ff7f0e\"/>
        </TimeSeries>
    </View>`,
      },
      {
        name: "Annotation templates: Import CSV",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Time%20Series%20from%20CSV%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20style%3D%22font-weight%3A%20normal%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Control%20tag%20for%20region%20labels%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeriesLabels%20name%3D%22label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Run%22%20background%3D%22%235b5%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Walk%22%20background%3D%22%2355f%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Object%20tag%20for%20time%20series%20data%20source%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20name%3D%22ts%22%20valueType%3D%22url%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20timeColumn%3D%22time%22%20value%3D%22%24csv%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sep%3D%22%2C%22%20overviewChannels%3D%22velocity%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22velocity%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%231f77b4%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22acceleration%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%23ff7f0e%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
        <Header value=\"Time Series from CSV\"
                style=\"font-weight: normal\"/>·
        <!-- Control tag for region labels -->
        <TimeSeriesLabels name=\"label\" toName=\"ts\">
            <Label value=\"Run\" background=\"#5b5\"/>
            <Label value=\"Walk\" background=\"#55f\"/>
        </TimeSeriesLabels>·
        <!-- Object tag for time series data source -->
        <TimeSeries name=\"ts\" valueType=\"url\"
                    timeColumn=\"time\" value=\"$csv\"
                    sep=\",\" overviewChannels=\"velocity\">
            <Channel column=\"velocity\"
                     strokeColor=\"#1f77b4\"/>
            <Channel column=\"acceleration\"
                     strokeColor=\"#ff7f0e\"/>
        </TimeSeries>
    </View>`,
      },
      {
        name: "Annotation templates: Time Series classification",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Time%20Series%20classification%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20style%3D%22font-weight%3A%20normal%22%2F%3E%3Cbr%3E%20%20%20%20%3C!--%20Choices%20(whole%20signal%20classification)%20--%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22pattern%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Growth%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Decay%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Labels%20(per%20region%20classification)%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeriesLabels%20name%3D%22label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Run%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Walk%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Object%20(source)%20tag%20for%20plot%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20name%3D%22ts%22%20value%3D%22%24csv%22%20valueType%3D%22url%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22first_column%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
        <Header value=\"Time Series classification\"
                style=\"font-weight: normal\"/>
        <!-- Choices (whole signal classification) -->
        <Choices name=\"pattern\" toName=\"ts\">
            <Choice value=\"Growth\"/>
            <Choice value=\"Decay\"/>
        </Choices>·
        <!-- Labels (per region classification) -->
        <TimeSeriesLabels name=\"label\" toName=\"ts\">
            <Label value=\"Run\"/>
            <Label value=\"Walk\"/>
        </TimeSeriesLabels>·
        <!-- Object (source) tag for plot -->
        <TimeSeries name=\"ts\" value=\"$csv\" valueType=\"url\">
            <Channel column=\"first_column\"/>
        </TimeSeries>
    </View>`,
      },
      {
        name: "Annotation templates: Video classifier",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CHyperText%20name%3D%22video%22%20value%3D%22%24video%22%2F%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22type%22%20toName%3D%22video%22%20choice%3D%22single-radio%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Awesome%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Groove%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
      <HyperText name=\"video\" value=\"$video\"/>
      <Choices name=\"type\" toName=\"video\" choice=\"single-radio\">
        <Choice value=\"Awesome\" />
        <Choice value=\"Groove\" />
      </Choices>
    </View>`,
      },
      {
        name: "Annotation templates: Rate website",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CHyperText%20name%3D%22website%22%20value%3D%22%24website%22%20inline%3D%22true%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Rate%20this%20website%22%2F%3E%3Cbr%3E%20%20%3CRating%20name%3D%22rating%22%20toName%3D%22website%22%20maxRating%3D%2210%22%20icon%3D%22star%22%20size%3D%22medium%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22choices%22%20choice%3D%22single-radio%22%20toName%3D%22website%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Important%20article%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Yellow%20press%22%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <HyperText name=\"website\" value=\"$website\" inline=\"true\"/>·
      <Header value=\"Rate this website\"/>
      <Rating name=\"rating\" toName=\"website\" maxRating=\"10\" icon=\"star\" size=\"medium\" />·
      <Choices name=\"choices\" choice=\"single-radio\" toName=\"website\" showInline=\"true\">
        <Choice value=\"Important article\"/>
        <Choice value=\"Yellow press\"/>
      </Choices>
    </View>`,
      },
      {
        name: "Advanced config templates: Audio regions labeling",
        url: "http://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20100%25%3B%20margin-left%3A%201em%3B%22%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22audio%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Speaker%201%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Speaker%202%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24audio%22%2F%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22padding%3A%2010px%2020px%3B%20margin-top%3A%202em%3B%20box-shadow%3A%202px%202px%208px%20%23AAA%3B%20margin-right%3A%201em%3B%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Provide%20Transcription%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CTextArea%20name%3D%22transcription%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20rows%3D%222%22%20editable%3D%22true%22%20perRegion%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20required%3D%22true%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22padding%3A%2010px%2020px%3B%20margin-top%3A%202em%3B%20box-shadow%3A%202px%202px%208px%20%23AAA%3B%20margin-right%3A%201em%3B%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Select%20Gender%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoices%20name%3D%22gender%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%20required%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Male%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Female%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A%20100%25%3B%20display%3A%20block%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Select%20region%20after%20creation%20to%20go%20next%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"width: 100%; margin-left: 1em;\">
        <Labels name=\"label\" toName=\"audio\">
          <Label value=\"Speaker 1\" />
          <Label value=\"Speaker 2\" />
        </Labels>·
        <Audio name=\"audio\" value=\"$audio\"/>
        <View style=\"padding: 10px 20px; margin-top: 2em; box-shadow: 2px 2px 8px #AAA; margin-right: 1em;\"
              visibleWhen=\"region-selected\">
          <Header value=\"Provide Transcription\" />
          <TextArea name=\"transcription\" toName=\"audio\"
                    rows=\"2\" editable=\"true\" perRegion=\"true\"
                    required=\"true\" />
        </View>
        <View style=\"padding: 10px 20px; margin-top: 2em; box-shadow: 2px 2px 8px #AAA; margin-right: 1em;\"
              visibleWhen=\"region-selected\">
          <Header value=\"Select Gender\" />
          <Choices name=\"gender\" toName=\"audio\"
                   perRegion=\"true\" required=\"true\">
            <Choice value=\"Male\" />
            <Choice value=\"Female\" />
          </Choices>
        </View>·
        <View style=\"width: 100%; display: block\">
          <Header value=\"Select region after creation to go next\"/>
        </View>·
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Image bboxes labeling",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CImage%20name%3D%22image%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CRectangleLabels%20name%3D%22label%22%20toName%3D%22image%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Airplane%22%20background%3D%22green%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Car%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%3C%2FRectangleLabels%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Describe%20object%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22answer%22%20toName%3D%22image%22%20editable%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%20required%3D%22true%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22choices%22%20toName%3D%22image%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20perRegion%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Correct%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Broken%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20100%25%3B%20display%3A%20block%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Select%20bbox%20after%20creation%20to%20go%20next%22%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Image name=\"image\" value=\"$image\"/>·
      <RectangleLabels name=\"label\" toName=\"image\">
        <Label value=\"Airplane\" background=\"green\"/>
        <Label value=\"Car\" background=\"blue\"/>
      </RectangleLabels>·
      <View visibleWhen=\"region-selected\">
        <Header value=\"Describe object\" />
        <TextArea name=\"answer\" toName=\"image\" editable=\"true\"
                  perRegion=\"true\" required=\"true\" />
        <Choices name=\"choices\" toName=\"image\"
                 perRegion=\"true\">
          <Choice value=\"Correct\"/>
          <Choice value=\"Broken\"/>
        </Choices>
      </View>·
      <View style=\"width: 100%; display: block\">
        <Header value=\"Select bbox after creation to go next\"/>
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Text spans labeling",
        url: "https://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20150px%3B%20padding-left%3A%202em%3B%20margin-right%3A%202em%3B%20background%3A%20%23f1f1f1%3B%20border-radius%3A%203px%22%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22ner%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22height%3A%20200px%3B%20overflow-y%3A%20auto%22%3E%3Cbr%3E%20%20%20%20%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CView%3E%3Cbr%3E%20%20%20%20%20%20%3CChoices%20name%3D%22relevance%22%20toName%3D%22text%22%20perRegion%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%09%3CChoice%20value%3D%22Relevant%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChoice%20value%3D%22Non%20Relevant%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%20%20%3CView%20visibleWhen%3D%22region-selected%22%3E%3Cbr%3E%20%20%20%20%20%20%09%3CHeader%20value%3D%22Your%20confidence%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%20%20%3CRating%20name%3D%22confidence%22%20toName%3D%22text%22%20perRegion%3D%22true%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A%20100%25%3B%20display%3A%20block%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Select%20span%20after%20creation%20to%20go%20next%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"width: 150px; padding-left: 2em; margin-right: 2em; background: #f1f1f1; border-radius: 3px\">
        <Labels name=\"ner\" toName=\"text\">
          <Label value=\"Person\" />
          <Label value=\"Organization\" />
        </Labels>
      </View>·
      <View>
        <View style=\"height: 200px; overflow-y: auto\">
          <Text name=\"text\" value=\"$text\" />
        </View>·
        <View>
          <Choices name=\"relevance\" toName=\"text\" perRegion=\"true\">
                <Choice value=\"Relevant\" />
            <Choice value=\"Non Relevant\" />
          </Choices>·
          <View visibleWhen=\"region-selected\">
                <Header value=\"Your confidence\" />
          </View>
          <Rating name=\"confidence\" toName=\"text\" perRegion=\"true\" />
        </View>·
        <View style=\"width: 100%; display: block\">
          <Header value=\"Select span after creation to go next\"/>
        </View>
      </View>·
    </View>`,
      },
      {
        name: "Advanced config templates: Image & Audio & Text",
        url: "https://localhost/?config=%3CView%3E%3Cbr%3E%3Cbr%3E%20%20%3C!--%20Image%20with%20bounding%20boxes%20--%3E%3Cbr%3E%20%20%3CView%20style%3D%22padding%3A%2025px%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20box-shadow%3A%202px%202px%208px%20%23AAA%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Label%20the%20image%20with%20bounding%20boxes%22%2F%3E%3Cbr%3E%20%20%20%20%3CImage%20name%3D%22img%22%20value%3D%22%24image%22%2F%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text1%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20value%3D%22Select%20label%2C%20click%20and%20drag%20on%20image%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CRectangleLabels%20name%3D%22tag%22%20toName%3D%22img%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20canRotate%3D%22false%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Airplane%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Car%22%20background%3D%22blue%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FRectangleLabels%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3C!--%20Audio%20with%20single%20choice%20--%3E%3Cbr%3E%20%20%3CView%20style%3D%22margin-top%3A%2020px%3B%20padding%3A%2025px%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20box-shadow%3A%202px%202px%208px%20%23AAA%3B%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Do%20you%20like%20this%20music%3F%22%2F%3E%3Cbr%3E%20%20%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24url%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22choices1%22%20toName%3D%22audio%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20choice%3D%22single%22%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22yes%22%20value%3D%22Yes%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22no%22%20value%3D%22No%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22unknown%22%20value%3D%22Don't%20know%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3C!--%20Text%20with%20multi-choices%20--%3E%3Cbr%3E%20%20%3CView%20style%3D%22margin-top%3A%2020px%3B%20padding%3A%2025px%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20box-shadow%3A%202px%202px%208px%20%23AAA%3B%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Classify%20the%20text%22%2F%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text2%22%20value%3D%22%24text%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22choices2%22%20toName%3D%22text2%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20choice%3D%22multiple%22%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22wisdom%22%20value%3D%22Wisdom%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20alias%3D%22long%22%20value%3D%22Long%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>·
      <!-- Image with bounding boxes -->
      <View style=\"padding: 25px;
                 box-shadow: 2px 2px 8px #AAA\">
        <Header value=\"Label the image with bounding boxes\"/>
        <Image name=\"img\" value=\"$image\"/>
        <Text name=\"text1\"
              value=\"Select label, click and drag on image\"/>·
        <RectangleLabels name=\"tag\" toName=\"img\"
                         canRotate=\"false\">
          <Label value=\"Airplane\" background=\"red\"/>
          <Label value=\"Car\" background=\"blue\"/>
        </RectangleLabels>
      </View>·
      <!-- Audio with single choice -->
      <View style=\"margin-top: 20px; padding: 25px;
                 box-shadow: 2px 2px 8px #AAA;\">
        <Header value=\"Do you like this music?\"/>
        <Audio name=\"audio\" value=\"$url\"/>
        <Choices name=\"choices1\" toName=\"audio\"
                 choice=\"single\">
          <Choice alias=\"yes\" value=\"Yes\"/>
          <Choice alias=\"no\" value=\"No\"/>
          <Choice alias=\"unknown\" value=\"Don't know\"/>
        </Choices>
      </View>·
      <!-- Text with multi-choices -->
      <View style=\"margin-top: 20px; padding: 25px;
                 box-shadow: 2px 2px 8px #AAA;\">
        <Header value=\"Classify the text\"/>
        <Text name=\"text2\" value=\"$text\"/>·
        <Choices name=\"choices2\" toName=\"text2\"
                 choice=\"multiple\">
          <Choice alias=\"wisdom\" value=\"Wisdom\"/>
          <Choice alias=\"long\" value=\"Long\"/>
        </Choices>
      </View>·
    </View>`,
      },
      {
        name: "Advanced config templates: Pairwise comparison",
        url: "https://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CHeader%3ESelect%20one%20of%20two%20items%3C%2FHeader%3E%3Cbr%3E%20%20%3CPairwise%20name%3D%22pw%22%20toName%3D%22text1%2Ctext2%22%20%2F%3E%3Cbr%3E%20%20%3CText%20name%3D%22text1%22%20value%3D%22%24text1%22%20%2F%3E%3Cbr%3E%20%20%3CText%20name%3D%22text2%22%20value%3D%22%24text2%22%20%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Header>Select one of two items</Header>
      <Pairwise name=\"pw\" toName=\"text1,text2\" />
      <Text name=\"text1\" value=\"$text1\" />
      <Text name=\"text2\" value=\"$text2\" />
    </View>`,
      },
      {
        name: "Advanced config templates: Relations among entities",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Note%3A%20To%20manage%20relations%20you%20need%20Label%20Studio%20entity%20panel%20to%20be%20shown%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CRelations%3E%3Cbr%3E%20%20%20%20%3CRelation%20value%3D%22Is%20A%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CRelation%20value%3D%22Has%20Function%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CRelation%20value%3D%22Involved%20In%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CRelation%20value%3D%22Related%20To%22%20%2F%3E%3Cbr%3E%20%20%3C%2FRelations%3E%3Cbr%3E%3Cbr%3E%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Subject%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Object%22%20%2F%3E%3Cbr%3E%20%20%3C%2FLabels%3E%3Cbr%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Header value=\"Note: To manage relations you need Label Studio entity panel to be shown\" />·
      <Relations>
        <Relation value=\"Is A\" />
        <Relation value=\"Has Function\" />
        <Relation value=\"Involved In\" />
        <Relation value=\"Related To\" />
      </Relations>·
      <Labels name=\"label\" toName=\"text\">
        <Label value=\"Subject\" />
        <Label value=\"Object\" />
      </Labels>·
      <Text name=\"text\" value=\"$text\" />
    </View>`,
      },
      {
        name: "Advanced config templates: Table with key-value",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Table%20with%20%7Bkey%3A%20value%7D%20pairs%22%2F%3E%3Cbr%3E%20%20%20%20%3CTable%20name%3D%22table%22%20value%3D%22%24item%22%2F%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
        <Header value=\"Table with {key: value} pairs\"/>
        <Table name=\"table\" value=\"$item\"/>
    </View>`,
      },
      {
        name: "Advanced config templates: Table with text fields",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CStyle%3E%3Cbr%3E%20%20%20%20input%5Btype%3D%22text%22%5D%5Bname%5E%3D%22table%22%5D%20%7B%20border-radius%3A%200px%3B%20border-right%3A%20none%3B%7D%3Cbr%3E%20%20%20%20input%5Btype%3D%22text%22%5D%5Bname%5E%3D%22table_metric%22%5D%20%7B%20border-right%3A%201px%20solid%20%23ddd%3B%20%7D%3Cbr%3E%20%20%20%20div%5Bclass*%3D%22%20TextAreaRegion_mark%22%5D%20%7Bbackground%3A%20none%3B%20height%3A%2033px%3B%20border-radius%3A%200%3B%20min-width%3A%20135px%3B%7D%3Cbr%3E%20%20%3C%2FStyle%3E%3Cbr%3E%3Cbr%3E%20%20%3CImage%20value%3D%22%24image%22%20name%3D%22image%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Trick%20to%20build%20a%20table%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22display%3A%20grid%3B%20%20grid-template-columns%3A%201fr%201fr%201fr%3B%20max-height%3A%20300px%3B%20width%3A%20400px%22%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_name_1%22%20toName%3D%22image%22%20placeholder%3D%22name%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_value_1%22%20toName%3D%22image%22%20placeholder%3D%22value%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_metric_1%22%20toName%3D%22image%22%20placeholder%3D%22metric%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_name_2%22%20toName%3D%22image%22%20placeholder%3D%22name%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_value_2%22%20toName%3D%22image%22%20placeholder%3D%22value%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_metric_2%22%20toName%3D%22image%22%20placeholder%3D%22metric%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_name_3%22%20toName%3D%22image%22%20placeholder%3D%22name%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_value_3%22%20toName%3D%22image%22%20placeholder%3D%22value%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%20%20%3CTextArea%20name%3D%22table_metric_3%22%20toName%3D%22image%22%20placeholder%3D%22metric%22%20editable%3D%22true%22%20maxSubmissions%3D%221%22%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
      <Style>
        input[type=\"text\"][name^=\"table\"] { border-radius: 0px; border-right: none;}
        input[type=\"text\"][name^=\"table_metric\"] { border-right: 1px solid #ddd; }
        div[class*=\" TextAreaRegion_mark\"] {background: none; height: 33px; border-radius: 0; min-width: 135px;}
      </Style>·
      <Image value=\"$image\" name=\"image\"/>·
      <Header value=\"Trick to build a table\"/>·
      <View style=\"display: grid;  grid-template-columns: 1fr 1fr 1fr; max-height: 300px; width: 400px\">
        <TextArea name=\"table_name_1\" toName=\"image\" placeholder=\"name\" editable=\"true\" maxSubmissions=\"1\"/>
        <TextArea name=\"table_value_1\" toName=\"image\" placeholder=\"value\" editable=\"true\" maxSubmissions=\"1\"/>
        <TextArea name=\"table_metric_1\" toName=\"image\" placeholder=\"metric\" editable=\"true\" maxSubmissions=\"1\"/>
        <TextArea name=\"table_name_2\" toName=\"image\" placeholder=\"name\" editable=\"true\" maxSubmissions=\"1\"/>
        <TextArea name=\"table_value_2\" toName=\"image\" placeholder=\"value\" editable=\"true\" maxSubmissions=\"1\"/>
        <TextArea name=\"table_metric_2\" toName=\"image\" placeholder=\"metric\" editable=\"true\" maxSubmissions=\"1\"/>
        <TextArea name=\"table_name_3\" toName=\"image\" placeholder=\"name\" editable=\"true\" maxSubmissions=\"1\"/>
        <TextArea name=\"table_value_3\" toName=\"image\" placeholder=\"value\" editable=\"true\" maxSubmissions=\"1\"/>
        <TextArea name=\"table_metric_3\" toName=\"image\" placeholder=\"metric\" editable=\"true\" maxSubmissions=\"1\"/>
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Video timeline segmentation",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Video%20timeline%20segmentation%20via%20Audio%20sync%20trick%22%2F%3E%3Cbr%3E%20%20%3CHyperText%20name%3D%22video%22%20value%3D%22%24video%22%2F%3E%3Cbr%3E%20%20%3CLabels%20name%3D%22tricks%22%20toName%3D%22audio%22%20choice%3D%22multiple%22%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Kickflip%22%20background%3D%22%231BB500%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22360%20Flip%22%20background%3D%22%23FFA91D%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabel%20value%3D%22Trick%22%20background%3D%22%23358EF3%22%20%2F%3E%3Cbr%3E%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3CAudio%20name%3D%22audio%22%20value%3D%22%24videoSource%22%20speed%3D%22false%22%2F%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E%3Cbr%3E%3C!--%3Cbr%3E%20%20It's%20very%20important%20to%20prepare%20task%20data%20correctly%2C%3Cbr%3E%20%20it%20includes%20HyperText%20%24video%20and%3Cbr%3E%20%20it%20must%20be%20like%20this%20example%20below%3A%3Cbr%3E--%3E%3Cbr%3E%3Cbr%3E%3C!--%20%7B%3Cbr%3E%20%22video%22%3A%20%22%3Cvideo%20src%3D'https%3A%2F%2Fapp.heartex.ai%2Fstatic%2Fsamples%2Fopossum_snow.mp4'%20width%3D100%25%20muted%20%2F%3E%3Cimg%20src%20onerror%3D%5C%22%24%3Dn%3D%3Edocument.getElementsByTagName(n)%5B0%5D%3Ba%3D%24('audio')%3Bv%3D%24('video')%3Ba.onseeked%3D()%3D%3E%7Bv.currentTime%3Da.currentTime%7D%3Ba.onplay%3D()%3D%3Ev.play()%3Ba.onpause%3D()%3D%3Ev.pause()%5C%22%20%2F%3E%22%2C%3Cbr%3E%20%22videoSource%22%3A%20%22https%3A%2F%2Fapp.heartex.ai%2Fstatic%2Fsamples%2Fopossum_snow.mp4%22%3Cbr%3E%7D%20--%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Header value=\"Video timeline segmentation via Audio sync trick\"/>
      <HyperText name=\"video\" value=\"$video\"/>
      <Labels name=\"tricks\" toName=\"audio\" choice=\"multiple\">
        <Label value=\"Kickflip\" background=\"#1BB500\" />
        <Label value=\"360 Flip\" background=\"#FFA91D\" />
        <Label value=\"Trick\" background=\"#358EF3\" />
      </Labels>
      <Audio name=\"audio\" value=\"$videoSource\" speed=\"false\"/>
    </View>·
    <!--
      It's very important to prepare task data correctly,
      it includes HyperText $video and
      it must be like this example below:
    -->·
    <!-- {
     \"video\": \"<video src='https://app.heartex.ai/static/samples/opossum_snow.mp4' width=100% muted /><img src onerror=\\\"$=n=>document.getElementsByTagName(n)[0];a=$('audio');v=$('video');a.onseeked=()=>{v.currentTime=a.currentTime};a.onplay=()=>v.play();a.onpause=()=>v.pause()\\\" />\",
     \"videoSource\": \"https://app.heartex.ai/static/samples/opossum_snow.mp4\"
    } -->`,
      },
      {
        name: "Advanced config templates: Import CSV no time",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Time%20Series%20from%20CSV%20without%20time%20column%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20style%3D%22font-weight%3A%20normal%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Control%20tag%20for%20region%20labels%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeriesLabels%20name%3D%22label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Run%22%20background%3D%22%235b5%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Walk%22%20background%3D%22%2355f%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Object%20tag%20for%20time%20series%20data%20source%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20name%3D%22ts%22%20valueType%3D%22url%22%20value%3D%22%24csv%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22velocity%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%231f77b4%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
        <Header value=\"Time Series from CSV without time column\"
                style=\"font-weight: normal\"/>·
        <!-- Control tag for region labels -->
        <TimeSeriesLabels name=\"label\" toName=\"ts\">
            <Label value=\"Run\" background=\"#5b5\"/>
            <Label value=\"Walk\" background=\"#55f\"/>
        </TimeSeriesLabels>·
        <!-- Object tag for time series data source -->
        <TimeSeries name=\"ts\" valueType=\"url\" value=\"$csv\">
            <Channel column=\"velocity\"
                     strokeColor=\"#1f77b4\"/>
        </TimeSeries>
    </View>`,
      },
      {
        name: "Advanced config templates: Import CSV headless",
        url: "https://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Time%20Series%20from%20headless%20CSV%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20style%3D%22font-weight%3A%20normal%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Control%20tag%20for%20region%20labels%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeriesLabels%20name%3D%22label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Run%22%20background%3D%22%235b5%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Walk%22%20background%3D%22%2355f%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Object%20tag%20for%20time%20series%20data%20source%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20name%3D%22ts%22%20valueType%3D%22url%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20timeColumn%3D%220%22%20value%3D%22%24csv%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sep%3D%22%2C%22%20overviewChannels%3D%221%2C2%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%221%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%231f77b4%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%222%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%23ff7f0e%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
        <Header value=\"Time Series from headless CSV\"
                style=\"font-weight: normal\"/>·
        <!-- Control tag for region labels -->
        <TimeSeriesLabels name=\"label\" toName=\"ts\">
            <Label value=\"Run\" background=\"#5b5\"/>
            <Label value=\"Walk\" background=\"#55f\"/>
        </TimeSeriesLabels>·
        <!-- Object tag for time series data source -->
        <TimeSeries name=\"ts\" valueType=\"url\"
                    timeColumn=\"0\" value=\"$csv\"
                    sep=\",\" overviewChannels=\"1,2\">
            <Channel column=\"1\"
                     strokeColor=\"#1f77b4\"/>
            <Channel column=\"2\"
                     strokeColor=\"#ff7f0e\"/>
        </TimeSeries>
    </View>`,
      },
      {
        name: "Advanced config templates: Relations between channels",
        url: "https://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Time%20Series%20from%20headless%20CSV%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20style%3D%22font-weight%3A%20normal%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Control%20tag%20for%20region%20labels%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeriesLabels%20name%3D%22label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Run%22%20background%3D%22%235b5%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Walk%22%20background%3D%22%2355f%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Object%20tag%20for%20time%20series%20data%20source%20--%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20name%3D%22ts%22%20valueType%3D%22url%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20timeColumn%3D%220%22%20value%3D%22%24csv%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sep%3D%22%2C%22%20overviewChannels%3D%221%2C2%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%221%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%231f77b4%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%222%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%23ff7f0e%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>
        <Header value=\"Time Series from headless CSV\"
                style=\"font-weight: normal\"/>·
        <!-- Control tag for region labels -->
        <TimeSeriesLabels name=\"label\" toName=\"ts\">
            <Label value=\"Run\" background=\"#5b5\"/>
            <Label value=\"Walk\" background=\"#55f\"/>
        </TimeSeriesLabels>·
        <!-- Object tag for time series data source -->
        <TimeSeries name=\"ts\" valueType=\"url\"
                    timeColumn=\"0\" value=\"$csv\"
                    sep=\",\" overviewChannels=\"1,2\">
            <Channel column=\"1\"
                     strokeColor=\"#1f77b4\"/>
            <Channel column=\"2\"
                     strokeColor=\"#ff7f0e\"/>
        </TimeSeries>
    </View>`,
      },
      {
        name: "Advanced config templates: Relations with text",
        url: "https://localhost/?config=%3CView%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Link%20logger%20events%20with%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20monitoring%20signals%20using%20relations%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Text%20setup%20--%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Mark%20actions%20in%20text%22%20size%3D%226%22%2F%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22logger_label%22%20toName%3D%22logger%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Error%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Success%22%20background%3D%22orange%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22logger%22%20value%3D%22%24event%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3C!--%20Time%20series%20setup%20--%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Mark%20regions%20in%20time%20series%22%20size%3D%226%22%2F%3E%3Cbr%3E%20%20%20%20%3CTimeSeriesLabels%20name%3D%22ts_label%22%20toName%3D%22ts%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Error%22%20background%3D%22red%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22High%20load%22%20background%3D%22darkorange%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeriesLabels%3E%3Cbr%3E%3Cbr%3E%20%20%20%20%3CTimeSeries%20name%3D%22ts%22%20valueType%3D%22url%22%20value%3D%22%24csv%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20sep%3D%22%2C%22%20timeColumn%3D%22time%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CChannel%20column%3D%22temperature%22%20units%3D%22%C2%B0C%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20strokeColor%3D%22%2317b%22%20legend%3D%22Temperature%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FTimeSeries%3E%3Cbr%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E%3Cbr%3E%3Cbr%3E%3C!--%3Cbr%3E%20%20%20%20Sample%20task%20data%20and%20completion%3Cbr%3E%20%20%20%20are%20for%20preview%20only%3Cbr%3E--%3E%3Cbr%3E%3Cbr%3E%3Cbr%3E%3C!--%20%7B%3Cbr%3E%20%20%22data%22%3A%20%7B%3Cbr%3E%20%20%20%20%22event%22%3A%20%22Authorization%20success%5CnError%20requesting%20auth%3A%20Authorization%20check%20failed%22%3Cbr%3E%20%20%7D%2C%3Cbr%3E%20%20%22completions%22%3A%20%5B%7B%3Cbr%3E%3Cbr%3E%20%20%20%20%22result%22%3A%20%5B%3Cbr%3E%20%20%20%20%20%20%20%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22value%22%3A%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22start%22%3A%2022%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22end%22%3A%2071%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22text%22%3A%20%22Error%20requesting%20auth%3A%20Authorization%20check%20failed%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22labels%22%3A%20%5B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22Error%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22id%22%3A%20%22ohdmBWCbqB%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22from_name%22%3A%20%22logger_label%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22to_name%22%3A%20%22logger%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22type%22%3A%20%22labels%22%3Cbr%3E%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22value%22%3A%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22start%22%3A%206%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22end%22%3A%2017%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22instant%22%3A%20false%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22timeserieslabels%22%3A%20%5B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22High%20load%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22id%22%3A%20%22JlujfAED9-%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22from_name%22%3A%20%22ts_label%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22to_name%22%3A%20%22ts%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22type%22%3A%20%22timeserieslabels%22%3Cbr%3E%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22value%22%3A%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22start%22%3A%200%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22end%22%3A%2021%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22text%22%3A%20%22Authorization%20success%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22labels%22%3A%20%5B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22Success%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22id%22%3A%20%22pA0JwD5dAF%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22from_name%22%3A%20%22logger_label%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22to_name%22%3A%20%22logger%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22type%22%3A%20%22labels%22%3Cbr%3E%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22value%22%3A%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22start%22%3A%2013%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22end%22%3A%2022%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22instant%22%3A%20false%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22timeserieslabels%22%3A%20%5B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22Error%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%5D%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22id%22%3A%20%22G4m2fkQAb4%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22from_name%22%3A%20%22ts_label%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22to_name%22%3A%20%22ts%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22type%22%3A%20%22timeserieslabels%22%3Cbr%3E%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22from_id%22%3A%20%22JlujfAED9-%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22to_id%22%3A%20%22pA0JwD5dAF%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22type%22%3A%20%22relation%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22direction%22%3A%20%22right%22%3Cbr%3E%20%20%20%20%20%20%20%20%7D%2C%3Cbr%3E%20%20%20%20%20%20%20%20%7B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22from_id%22%3A%20%22G4m2fkQAb4%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22to_id%22%3A%20%22ohdmBWCbqB%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22type%22%3A%20%22relation%22%2C%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%22direction%22%3A%20%22right%22%3Cbr%3E%20%20%20%20%20%20%20%20%7D%3Cbr%3E%20%20%20%20%5D%3Cbr%3E%20%20%7D%5D%3Cbr%3E%7D%3Cbr%3E--%3E%3Cbr%3E",
        expectedConfig: `<View>
        <Header value=\"Link logger events with
                       monitoring signals using relations\"/>·
        <!-- Text setup -->
        <Header value=\"Mark actions in text\" size=\"6\"/>
        <Labels name=\"logger_label\" toName=\"logger\">
            <Label value=\"Error\" background=\"red\"/>
            <Label value=\"Success\" background=\"orange\"/>
        </Labels>·
        <Text name=\"logger\" value=\"$event\"/>·
        <!-- Time series setup -->
        <Header value=\"Mark regions in time series\" size=\"6\"/>
        <TimeSeriesLabels name=\"ts_label\" toName=\"ts\">
            <Label value=\"Error\" background=\"red\"/>
            <Label value=\"High load\" background=\"darkorange\"/>
        </TimeSeriesLabels>·
        <TimeSeries name=\"ts\" valueType=\"url\" value=\"$csv\"
                    sep=\",\" timeColumn=\"time\">
            <Channel column=\"temperature\" units=\"°C\"
                     strokeColor=\"#17b\" legend=\"Temperature\"/>
        </TimeSeries>·
    </View>··
    <!--
        Sample task data and completion
        are for preview only
    -->··
    <!-- {
      \"data\": {
        \"event\": \"Authorization success\\nError requesting auth: Authorization check failed\"
      },
      \"completions\": [{·
        \"result\": [
            {
                \"value\": {
                    \"start\": 22,
                    \"end\": 71,
                    \"text\": \"Error requesting auth: Authorization check failed\",
                    \"labels\": [
                        \"Error\"
                    ]
                },
                \"id\": \"ohdmBWCbqB\",
                \"from_name\": \"logger_label\",
                \"to_name\": \"logger\",
                \"type\": \"labels\"
            },
            {
                \"value\": {
                    \"start\": 6,
                    \"end\": 17,
                    \"instant\": false,
                    \"timeserieslabels\": [
                        \"High load\"
                    ]
                },
                \"id\": \"JlujfAED9-\",
                \"from_name\": \"ts_label\",
                \"to_name\": \"ts\",
                \"type\": \"timeserieslabels\"
            },
            {
                \"value\": {
                    \"start\": 0,
                    \"end\": 21,
                    \"text\": \"Authorization success\",
                    \"labels\": [
                        \"Success\"
                    ]
                },
                \"id\": \"pA0JwD5dAF\",
                \"from_name\": \"logger_label\",
                \"to_name\": \"logger\",
                \"type\": \"labels\"
            },
            {
                \"value\": {
                    \"start\": 13,
                    \"end\": 22,
                    \"instant\": false,
                    \"timeserieslabels\": [
                        \"Error\"
                    ]
                },
                \"id\": \"G4m2fkQAb4\",
                \"from_name\": \"ts_label\",
                \"to_name\": \"ts\",
                \"type\": \"timeserieslabels\"
            },
            {
                \"from_id\": \"JlujfAED9-\",
                \"to_id\": \"pA0JwD5dAF\",
                \"type\": \"relation\",
                \"direction\": \"right\"
            },
            {
                \"from_id\": \"G4m2fkQAb4\",
                \"to_id\": \"ohdmBWCbqB\",
                \"type\": \"relation\",
                \"direction\": \"right\"
            }
        ]
      }]
    }
    -->`,
      },
      {
        name: "Advanced config templates: Filtering long labels list",
        url: "http://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20350px%3B%20padding-right%3A%201em%3B%20height%3A%20400px%3B%20overflow-y%3A%20auto%22%3E%3Cbr%3E%20%20%20%20%3CFilter%20name%3D%22fl%22%20toName%3D%22ner%22%20hotkey%3D%22shift%2Bf%22%20minlength%3D%221%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22ner%22%20toName%3D%22text%22%20showInline%3D%22false%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22height%3A%20400px%3B%20overflow%3A%20auto%22%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"width: 350px; padding-right: 1em; height: 400px; overflow-y: auto\">
        <Filter name=\"fl\" toName=\"ner\" hotkey=\"shift+f\" minlength=\"1\" />
        <Labels name=\"ner\" toName=\"text\" showInline=\"false\">
          <Label value=\"Person\" />
          <Label value=\"Organization\" />
        </Labels>
      </View>·
      <View style=\"height: 400px; overflow: auto\">
        <Text name=\"text\" value=\"$text\" />
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Long text with scrollbar",
        url: "http://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22padding%3A%200em%201em%3B%20background%3A%20%23f1f1f1%3B%20margin-right%3A%201em%3B%20border-radius%3A%203px%22%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22position%3A%20sticky%3B%20top%3A%200%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22height%3A%20300px%3B%20overflow%3A%20auto%3B%22%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text%22%20value%3D%22%24longText%22%20%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"padding: 0em 1em; background: #f1f1f1; margin-right: 1em; border-radius: 3px\">
        <View style=\"position: sticky; top: 0\">
          <Labels name=\"label\" toName=\"text\">
            <Label value=\"Person\" />
            <Label value=\"Organization\" />
          </Labels>
        </View>
      </View>·
      <View style=\"height: 300px; overflow: auto;\">
        <Text name=\"text\" value=\"$longText\" />
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Pretty choices",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%2F%3E%3Cbr%3E%20%20%3CView%20style%3D%22box-shadow%3A%202px%202px%205px%20%23999%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20padding%3A%2020px%3B%20margin-top%3A%202em%3B%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20border-radius%3A%205px%3B%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22Choose%20text%20sentiment%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22sentiment%22%20toName%3D%22text%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20%20%20choice%3D%22single%22%20showInLine%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Positive%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Negative%22%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Neutral%22%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Text name=\"text\" value=\"$text\"/>
      <View style=\"box-shadow: 2px 2px 5px #999;
                   padding: 20px; margin-top: 2em;
                   border-radius: 5px;\">
        <Header value=\"Choose text sentiment\"/>
        <Choices name=\"sentiment\" toName=\"text\"
                 choice=\"single\" showInLine=\"true\">
          <Choice value=\"Positive\"/>
          <Choice value=\"Negative\"/>
          <Choice value=\"Neutral\"/>
        </Choices>
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Sticky header",
        url: "https://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CView%20style%3D%22padding%3A%200%201em%3B%20margin%3A%201em%200%3B%20background%3A%20%23f1f1f1%3B%20position%3A%20sticky%3B%20top%3A%200%3B%20border-radius%3A%203px%3B%20z-index%3A%20100%22%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22text%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <View style=\"padding: 0 1em; margin: 1em 0; background: #f1f1f1; position: sticky; top: 0; border-radius: 3px; z-index: 100\">
        <Labels name=\"label\" toName=\"text\" showInline=\"true\">
          <Label value=\"Person\" />
          <Label value=\"Organization\" />
        </Labels>
      </View>·
      <View>
        <Text name=\"text\" value=\"$text\" />
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Sticky left column",
        url: "http://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22padding%3A%200em%201em%3B%20background%3A%20%23f1f1f1%3B%20margin-right%3A%201em%3B%20border-radius%3A%203px%22%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22position%3A%20sticky%3B%20top%3A%200%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"padding: 0em 1em; background: #f1f1f1; margin-right: 1em; border-radius: 3px\">
        <View style=\"position: sticky; top: 0\">
          <Labels name=\"label\" toName=\"text\">
            <Label value=\"Person\" />
            <Label value=\"Organization\" />
          </Labels>
        </View>
      </View>·
      <View>
        <Text name=\"text\" value=\"$text\" />
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Three columns",
        url: "http://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20150px%3B%20padding%3A%200%201em%3B%20margin-right%3A%200.5em%3B%20background%3A%20%23f1f1f1%3B%20border-radius%3A%203px%22%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20style%3D%22padding%3A%200%201em%3B%20margin-left%3A%200.5em%3B%20background%3A%20%23f1f1f1%3B%20border-radius%3A%203px%22%3E%3Cbr%3E%20%20%20%20%3CChoices%20name%3D%22importance%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Text%20Importance%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22High%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Medium%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CChoice%20value%3D%22Low%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FChoices%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"width: 150px; padding: 0 1em; margin-right: 0.5em; background: #f1f1f1; border-radius: 3px\">
        <Labels name=\"label\" toName=\"text\">
          <Label value=\"Person\" />
          <Label value=\"Organization\" />
        </Labels>
      </View>·
      <View>
        <Text name=\"text\" value=\"$text\" />
      </View>·
      <View style=\"padding: 0 1em; margin-left: 0.5em; background: #f1f1f1; border-radius: 3px\">
        <Choices name=\"importance\" toName=\"text\">
          <Header value=\"Text Importance\" />
          <Choice value=\"High\" />
          <Choice value=\"Medium\" />
          <Choice value=\"Low\" />
        </Choices>
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Two columns",
        url: "http://localhost/?config=%3CView%20style%3D%22display%3A%20flex%3B%22%3E%3Cbr%3E%20%20%3CView%20style%3D%22width%3A%20150px%3B%20padding-left%3A%202em%3B%20margin-right%3A%202em%3B%20background%3A%20%23f1f1f1%3B%20border-radius%3A%203px%22%3E%3Cbr%3E%20%20%20%20%3CLabels%20name%3D%22label%22%20toName%3D%22text%22%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Person%22%20%2F%3E%3Cbr%3E%20%20%20%20%20%20%3CLabel%20value%3D%22Organization%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FLabels%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View style=\"display: flex;\">
      <View style=\"width: 150px; padding-left: 2em; margin-right: 2em; background: #f1f1f1; border-radius: 3px\">
        <Labels name=\"label\" toName=\"text\">
          <Label value=\"Person\" />
          <Label value=\"Organization\" />
        </Labels>
      </View>·
      <View>
        <Text name=\"text\" value=\"$text\" />
      </View>
    </View>`,
      },
      {
        name: "Advanced config templates: Conditional classification",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CText%20name%3D%22text1%22%20value%3D%22%24text1%22%20%2F%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22sentiment%22%20toName%3D%22text1%22%20showInLine%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Positive%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Negative%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Neutral%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%3CView%20visibleWhen%3D%22choice-selected%22%3Cbr%3E%20%20%20%20%20%20%20%20whenTagName%3D%22sentiment%22%20whenChoiceValue%3D%22Positive%22%3E%3Cbr%3E%20%20%20%20%3CHeader%20value%3D%22What%20about%20this%20text%3F%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CText%20name%3D%22text2%22%20value%3D%22%24text2%22%20%2F%3E%3Cbr%3E%20%20%3C%2FView%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22sentiment2%22%20toName%3D%22text2%22%3Cbr%3E%20%20%09%20%20%20choice%3D%22single%22%20showInLine%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20visibleWhen%3D%22choice-selected%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20whenTagName%3D%22sentiment%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20whenChoiceValue%3D%22Positive%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Positive%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Negative%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Neutral%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Text name=\"text1\" value=\"$text1\" />
      <Choices name=\"sentiment\" toName=\"text1\" showInLine=\"true\">
        <Choice value=\"Positive\" />
        <Choice value=\"Negative\" />
        <Choice value=\"Neutral\" />
      </Choices>·
      <View visibleWhen=\"choice-selected\"
            whenTagName=\"sentiment\" whenChoiceValue=\"Positive\">
        <Header value=\"What about this text?\" />
        <Text name=\"text2\" value=\"$text2\" />
      </View>·
      <Choices name=\"sentiment2\" toName=\"text2\"
           choice=\"single\" showInLine=\"true\"
               visibleWhen=\"choice-selected\"
               whenTagName=\"sentiment\"
               whenChoiceValue=\"Positive\">
        <Choice value=\"Positive\" />
        <Choice value=\"Negative\" />
        <Choice value=\"Neutral\" />
      </Choices>
    </View>`,
      },
      {
        name: "Advanced config templates: Three level classification",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22sentiment%22%20toName%3D%22text%22%20showInLine%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Positive%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Negative%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Neutral%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22other-props%22%20toName%3D%22text%22%3Cbr%3E%20%20%09%20%20%20choice%3D%22single%22%20showInLine%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20visibleWhen%3D%22choice-selected%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20whenTagName%3D%22sentiment%22%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A%20100%25%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Other%20properties%20of%20the%20text%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Descriptive%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Emotional%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22emotion%22%20toName%3D%22text%22%3Cbr%3E%20%20%09%20%20%20choice%3D%22single%22%20showInLine%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20visibleWhen%3D%22choice-selected%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20whenTagName%3D%22other-props%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20whenChoiceValue%3D%22Emotional%22%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A%20100%25%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22What%20emotion%3F%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Sadness%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Disgust%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Fear%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Surprise%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E",
        expectedConfig: `<View>
      <Text name=\"text\" value=\"$text\" />·
      <Choices name=\"sentiment\" toName=\"text\" showInLine=\"true\">
        <Choice value=\"Positive\" />
        <Choice value=\"Negative\" />
        <Choice value=\"Neutral\" />
      </Choices>·
      <Choices name=\"other-props\" toName=\"text\"
           choice=\"single\" showInLine=\"true\"
               visibleWhen=\"choice-selected\"
               whenTagName=\"sentiment\">
        <View style=\"width: 100%\">
          <Header value=\"Other properties of the text\" />
        </View>
        <Choice value=\"Descriptive\" />
        <Choice value=\"Emotional\" />
      </Choices>·
      <Choices name=\"emotion\" toName=\"text\"
           choice=\"single\" showInLine=\"true\"
               visibleWhen=\"choice-selected\"
               whenTagName=\"other-props\"
               whenChoiceValue=\"Emotional\">
        <View style=\"width: 100%\">
          <Header value=\"What emotion?\" />
        </View>
        <Choice value=\"Sadness\" />
        <Choice value=\"Disgust\" />
        <Choice value=\"Fear\" />
        <Choice value=\"Surprise\" />
      </Choices>
    </View>`,
      },
      {
        name: "Advanced config templates: Two level classification",
        url: "http://localhost/?config=%3CView%3E%3Cbr%3E%3Cbr%3E%20%20%3CText%20name%3D%22text%22%20value%3D%22%24text%22%20%2F%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22sentiment%22%20toName%3D%22text%22%20showInLine%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Positive%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Negative%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Neutral%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22other-props%22%20toName%3D%22text%22%3Cbr%3E%20%20%09%20%20%20choice%3D%22single%22%20showInLine%3D%22true%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20visibleWhen%3D%22choice-selected%22%3Cbr%3E%20%20%20%20%20%20%20%20%20%20%20whenTagName%3D%22sentiment%22%3E%3Cbr%3E%20%20%20%20%3CView%20style%3D%22width%3A100%25%22%3E%3Cbr%3E%20%20%20%20%20%20%3CHeader%20value%3D%22Other%20properties%20of%20the%20text%22%20%2F%3E%3Cbr%3E%20%20%20%20%3C%2FView%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Descriptive%22%20%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Emotional%22%20%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3Cbr%3E%3C%2FView%3E",
        expectedConfig: `<View>·
      <Text name=\"text\" value=\"$text\" />
      <Choices name=\"sentiment\" toName=\"text\" showInLine=\"true\">
        <Choice value=\"Positive\" />
        <Choice value=\"Negative\" />
        <Choice value=\"Neutral\" />
      </Choices>·
      <Choices name=\"other-props\" toName=\"text\"
           choice=\"single\" showInLine=\"true\"
               visibleWhen=\"choice-selected\"
               whenTagName=\"sentiment\">
        <View style=\"width:100%\">
          <Header value=\"Other properties of the text\" />
        </View>
        <Choice value=\"Descriptive\" />
        <Choice value=\"Emotional\" />
      </Choices>·
    </View>`,
      },
    ])("$name", async ({ url, expectedConfig }) => {
      Object.defineProperty(window, "location", {
        value: new URL(url),
        writable: true,
        configurable: true,
      });

      render(<PlaygroundApp />);

      await waitFor(() => {
        expect(mockSetError).not.toHaveBeenCalled();
        expect(mockSetConfig).toHaveBeenCalledWith(removeAllSpaceLikeCharacters(expectedConfig));
      });
    });
  });
});
