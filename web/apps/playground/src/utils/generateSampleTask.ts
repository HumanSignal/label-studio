import { createUtcFormatter } from "./date";

// Wikimedia Commons public domain sample URLs
const SAMPLE_IMAGE = "https://app.heartex.ai/static/samples/sample.jpg";
const SAMPLE_IMAGE2 = "https://app.heartex.ai/static/samples/sample.jpg"; //"https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";
const SAMPLE_AUDIO =
  "https://upload.wikimedia.org/wikipedia/commons/9/9d/Bach_-_Cello_Suite_no._1_in_G_major,_BWV_1007_-_I._Pr%C3%A9lude.ogg";
const SAMPLE_VIDEO = "https://app.heartex.ai/static/samples/opossum_snow.mp4";
const SAMPLE_VIDEO_EMBED = `<video src='${SAMPLE_VIDEO}' width=100% controls></video>`;
const SAMPLE_HTML =
  '<div style="max-width: 750px"><div style="clear: both"><div style="float: right; display: inline-block; border: 1px solid #F2F3F4; background-color: #F8F9F9; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>Jules</b>: No no, Mr. Wolfe, it\'s not like that. Your help is definitely appreciated.</p></div></div><div style="clear: both"><div style="float: right; display: inline-block; border: 1px solid #F2F3F4; background-color: #F8F9F9; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>Vincent</b>: Look, Mr. Wolfe, I respect you. I just don\'t like people barking orders at me, that\'s all.</p></div></div><div style="clear: both"><div style="display: inline-block; border: 1px solid #D5F5E3; background-color: #EAFAF1; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>The Wolf</b>: If I\'m curt with you, it\'s because time is a factor. I think fast, I talk fast, and I need you two guys to act fast if you want to get out of this. So pretty please, with sugar on top, clean the car.</p></div></div></div>';
const SAMPLE_WEBSITE = "<a href='https://labelstud.io'>https://labelstud.io</a>";
const SAMPLE_PDF_EMBED = "<embed src='https://app.heartex.ai/static/samples/sample.pdf' width='100%' height='600px'/>";
const SAMPLE_WEBSITE_EMBED = "<iframe src='https://labelstud.io' width='100%' height='600px'/>";
const SAMPLE_CSV = "https://app.heartex.ai/samples/time-series.csv";
const SAMPLE_OCR_IMAGE = "https://htx-pub.s3.amazonaws.com/demo/ocr/example.jpg";

const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

const BEGIN_OF_TIME = new Date("2020-01-02T00:00:00.000Z").getTime();

const parseTypeAndOption = (valueType: string) => {
  const [, type, sep] = valueType.match(/^(\w+)(.)?/) ?? [];
  const options: Record<string, string> = {};

  if (sep) {
    const pairs = valueType.split(sep).slice(1);

    pairs.forEach((pair) => {
      const [k, v] = pair.split("=", 2);

      options[k] = v ?? true; // options without values are `true`
    });
  }

  return { type, sep, options };
};

const generateTimeseriesData = (
  timeColumn?: string,
  columns?: string[],
  options?: {
    type?: "csv" | "json";
    separator?: string;
    dataName?: string;
    stringify?: boolean;
    timeFormat?: string;
  },
) => {
  const { type = "csv", separator = ",", dataName, stringify = true, timeFormat } = options || {};
  const headers = [timeColumn ?? "time", ...(columns || [])];
  const data = Array.from({ length: 100 }, (_, i) => {
    // time, column1, column2, ... columnN
    return [formatTime(i, timeFormat), ...Array.from({ length: columns?.length || 0 }, () => randomFloat(-2, 2))];
  });

  if (type === "csv") {
    return [headers.join(separator), ...data.map((row) => row.join(separator))].join("\n");
  }

  // Output as json object with columns as top level keys, and the arrays of values
  const resultData = Object.values(headers).reduce(
    (acc, header, index) => {
      acc[header.toLowerCase()] = data.map((row) => row[index]);
      return acc;
    },
    {} as Record<any, any[]>,
  );
  let result = {} as Record<string, any>;
  if (dataName) result[dataName] = resultData;
  else result = resultData;

  if (stringify) {
    return JSON.stringify(result);
  }
  return result;
};

// Override fetch for CSV and other static files that would produce a CORS error potentially
const originalFetch = global.fetch;
// @ts-ignore
global.fetch = async (url: string) => {
  if (url.startsWith(SAMPLE_CSV)) {
    const params = new URLSearchParams(url.split("?")[1]);
    const timeColumn = params.get("time") || "None";
    const values = params.get("values");
    const separator = params.get("sep") || ",";
    const type = params.get("type") || "csv";
    const timeFormat = params.get("tf");
    const columns = values?.split(separator) || [];
    const data = generateTimeseriesData(timeColumn, columns, {
      type: type as "csv" | "json",
      separator,
      stringify: type === "json",
      timeFormat: timeFormat || undefined,
    });
    return new Response(data as string);
  }
  return originalFetch(url);
};

// Format based on timeFormat
// ex. timeFormat="%Y-%m-%d %H:%M:%S.%f"
// inline the code of d3.utcFormat
const formatTime = (time: number | string, timeFormat = "") => {
  if (typeof time === "string") time = Number(time);
  if (!timeFormat?.trim()) return time;

  if (time < 10000) {
    const nextDay = new Date(BEGIN_OF_TIME);
    nextDay.setDate(nextDay.getDate() + time);
    nextDay.setHours(0, 0, 0, 0);
    time = nextDay.getTime();
  }

  const format = createUtcFormatter(timeFormat);

  return format(new Date(time));
};

// Utility to generate a sample task from a Label Studio XML config
export async function generateSampleTaskFromConfig(config: string): Promise<{
  id: number;
  data: Record<string, any>;
  annotations?: any[];
  predictions?: any[];
}> {
  const parser = new DOMParser();
  let xml: Document;
  try {
    xml = parser.parseFromString(`<View>${config}</View>`, "text/xml");
  } catch (e) {
    return { id: 1, data: {}, annotations: [{ id: 1, result: [] }], predictions: [] };
  }

  // Try to find a root-level comment with a JSON object
  let userData: Record<string, any> | undefined;
  let userAnnotation: any;
  const root = xml.documentElement;
  if (root) {
    for (let i = 0; i < root.childNodes.length; i++) {
      const node = root.childNodes[i];
      if (node.nodeType === Node.COMMENT_NODE) {
        try {
          const json = JSON.parse(node.nodeValue || "");
          if (typeof json === "object" && json !== null) {
            if (typeof json.data === "object" && json.data !== null) {
              userData = json.data;
            }
            if (typeof json.annotation === "object" && json.annotation !== null) {
              userAnnotation = json.annotation;
            }
            if (!userData && !userAnnotation) {
              userData = json;
            }
            if (userData || userAnnotation) {
              break;
            }
          }
        } catch (e) {
          // Ignore invalid JSON in comments
        }
      }
    }
  }

  // Find all elements with a value or valueList attribute that starts with $
  const data: Record<string, any> = userData ? { ...userData } : {};
  const valueNodes = Array.from(xml.querySelectorAll("[value], [valueList]"));

  valueNodes.forEach((node) => {
    const valueAttr = node.getAttribute("value") || node.getAttribute("valueList");
    if (!valueAttr || !valueAttr.startsWith("$") || valueAttr.length < 2) return;
    const key = valueAttr.slice(1);
    if (data[key] !== undefined) return; // already set

    // Detect valueType="url" or valueList
    const getValueType = (node: Element) => node.getAttribute("valueType") || node.getAttribute("valuetype");
    const valueType = getValueType(node);
    const isInline = node.getAttribute("inline") === "true";
    const isValueList = node.hasAttribute("valueList");
    let tag = node.tagName.toLowerCase();
    let onlyUrls = valueType === "url";
    const value = node.getAttribute("value");
    // If some other usage of a value is a url, then it's a url, lets skip this one
    if (
      valueType !== "url" &&
      valueNodes.some((n) => n.getAttribute("value") === value && getValueType(n)?.includes("url"))
    ) {
      return;
    }
    if (tag === "image" && value?.includes("ocr")) {
      tag = "ocr";
    } else if (tag === "text" && (value?.includes("coref") || value?.includes("long"))) {
      tag = "longtext";
    }
    if (tag === "hypertext" && value?.includes("pdf")) {
      tag = "pdf";
    } else if (tag === "hypertext" && value?.includes("video")) {
      tag = "video_embed";
    } else if (tag === "hypertext" && (value?.includes("website") || value?.includes("iframe"))) {
      if (isInline) {
        tag = "website_embed";
      } else {
        tag = "website";
      }
    } else if (tag === "timeseries") {
      const isJson = valueType?.includes("json");
      onlyUrls = onlyUrls || !isJson;
      const columns = Array.from(node.querySelectorAll("Channel"));
      const timeColumn = node.getAttribute("timeColumn");
      let csvSeparator = node.getAttribute("sep");
      const timeFormat = node.getAttribute("timeFormat");
      const resolver = node.getAttribute("resolver");
      let type = isJson ? "json" : "csv";

      if (resolver) {
        const { type: _type, sep } = parseTypeAndOption(resolver);
        csvSeparator = sep;
        type = _type as "csv" | "json";
      }
      const values = columns.map((c) => c.getAttribute("column") || "").join(csvSeparator ?? ",");

      if (onlyUrls) {
        const csvUrl = new URL(SAMPLE_CSV);
        // Check children nodes Channel for columns
        if (timeColumn) csvUrl.searchParams.set("time", timeColumn);
        if (values) csvUrl.searchParams.set("values", values);
        if (csvSeparator) csvUrl.searchParams.set("sep", csvSeparator);
        if (timeFormat) csvUrl.searchParams.set("tf", timeFormat);
        if (type) csvUrl.searchParams.set("type", type);
        data[key] = csvUrl.toString();
      } else {
        data[key] = generateTimeseriesData(timeColumn ?? "time", values.split(","), {
          type: isJson ? "json" : "csv",
          separator: csvSeparator ?? ",",
          timeFormat: timeFormat ?? undefined,
          stringify: !isJson,
        });
      }
      return;
    }

    // Special handling for Paragraphs
    if (tag === "paragraphs") {
      const nameKey = node.getAttribute("nameKey") || node.getAttribute("namekey") || "author";
      const textKey = node.getAttribute("textKey") || node.getAttribute("textkey") || "text";
      if (value?.toLowerCase().includes("humanmachinedialogue")) {
        data[key] = [
          { [nameKey]: "Human", [textKey]: "Sample: Hi, Robot!" },
          { [nameKey]: "Robot", [textKey]: "Sample: Nice to meet you, human! Tell me what you want." },
          { [nameKey]: "Human", [textKey]: "Sample: Order me a pizza from Golden Boy at Green Street " },
          { [nameKey]: "Robot", [textKey]: "Sample: Done. When do you want to get the order?" },
          { [nameKey]: "Human", [textKey]: "Sample: At 3am in the morning, please" },
        ];
      } else {
        data[key] = [
          { [nameKey]: "Alice", [textKey]: "Sample: Text #1" },
          { [nameKey]: "Bob", [textKey]: "Sample: Text #2" },
          { [nameKey]: "Alice", [textKey]: "Sample: Text #3" },
          { [nameKey]: "Bob", [textKey]: "Sample: Text #4" },
          { [nameKey]: "Alice", [textKey]: "Sample: Text #5" },
        ];
      }
      return;
    }

    // Special handling for List
    if (tag === "list" || tag === "ranker") {
      data[key] = [
        {
          id: 1,
          title: "Sample: The Amazing World of Opossums",
          body: "Opossums are fascinating marsupials native to North America. They have prehensile tails, which help them to climb trees and navigate their surroundings with ease. Additionally, they are known for their unique defense mechanism, called 'playing possum,' where they mimic the appearance and smell of a dead animal to deter predators.",
        },
        {
          id: 2,
          title: "Sample: Opossums: Nature's Pest Control",
          body: "Opossums play a crucial role in controlling insect and rodent populations, as they consume a variety of pests like cockroaches, beetles, and mice. This makes them valuable allies for gardeners and homeowners, as they help to maintain a balanced ecosystem and reduce the need for chemical pest control methods.",
        },
        {
          id: 3,
          title: "Sample: Fun Fact: Opossums Are Immune to Snake Venom",
          body: "One surprising characteristic of opossums is their natural immunity to snake venom. They have a unique protein in their blood called 'Lethal Toxin-Neutralizing Factor' (LTNF), which neutralizes venom from a variety of snake species, including rattlesnakes and cottonmouths. This allows opossums to prey on snakes without fear of harm, further highlighting their important role in the ecosystem.",
        },
      ];
      return;
    }

    // Special handling for Table
    if (tag === "table") {
      data[key] = { "Card number": 18799210, "First name": "Sample", "Last name": "Text" };
      return;
    }

    // Special handling for PDF
    if (tag === "pdf") {
      data[key] = SAMPLE_PDF_EMBED;
      return;
    }

    // Special handling for Video
    if (tag === "video_embed") {
      data[key] = SAMPLE_VIDEO_EMBED;
      return;
    }

    // Special handling for Website/IFrame
    if (tag === "website" || tag === "iframe") {
      data[key] = SAMPLE_WEBSITE_EMBED;
      return;
    }

    if (tag === "website_embed") {
      data[key] = SAMPLE_WEBSITE;
      return;
    }

    // Special handling for CSV
    if (tag === "csv") {
      data[key] = SAMPLE_CSV;
      return;
    }

    // Special handling for OCR
    if (tag === "ocr") {
      data[key] = SAMPLE_OCR_IMAGE;
      return;
    }

    // Special handling for longText, corefText, captioning, etc.
    if (tag === "longtext") {
      data[key] =
        `Sample: This is sample text for long text task. It can be used for text classification, named entity recognition, coreference resolution, etc.

        Opossums are frequently considered to be living fossils, and as a result are often used to approximate the ancestral therian condition in comparative studies.

        However, this is inaccurate, the oldest opossum fossils are early Miocene in age (roughly 20 million years old) and the last common ancestor of all living opossums approximately dates to the Oligocene-Miocene boundary (roughly 23 million years ago) and is at most no older than Oligocene in age. i

        Many extinct metatherians once considered early opossums, such as Alphadon, Peradectes, Herpetotherium, and Pucadelphys, have since been recognized to have been previously grouped with opossums on the basis of plesiomorphies and are now considered to represent older branches of Metatheria only distantly related to modern opossums.`;
      return;
    }
    if (tag === "captioning") {
      data[key] = SAMPLE_IMAGE2;
      return;
    }

    // Special handling for pairText1, pairText2
    if (tag === "pairtext1") {
      data[key] = "Sample: Text #1";
      return;
    }
    if (tag === "pairtext2") {
      data[key] = "Sample: Text #2";
      return;
    }

    // Main tag-based logic
    if (tag === "image" || tag === "hyperimage") {
      if (isValueList) {
        data[key] = [SAMPLE_IMAGE, SAMPLE_IMAGE2];
      } else {
        data[key] = SAMPLE_IMAGE;
      }
    } else if (tag === "audio" || tag === "audioplus") {
      data[key] = SAMPLE_AUDIO;
    } else if (tag === "video") {
      data[key] = SAMPLE_VIDEO;
    } else if (tag === "text") {
      data[key] = "Sample: Your text will go here.";
    } else if (tag === "hypertext") {
      data[key] = SAMPLE_HTML;
    } else if (tag === "choices" || tag.endsWith("labels")) {
      const type = tag.endsWith("labels") ? "Label" : "Choice";

      data[key] = [
        { value: `Dynamic${type}1`, background: "#ff0000" },
        { value: `Dynamic${type}2`, background: "#0000ff" },
      ];
    } else if (tag === "taxonomy") {
      data[key] = [
        {
          value: "Category 1",
          children: [
            { value: "Subcategory 1.1" },
            { value: "Subcategory 1.2", children: [{ value: "Subcategory 1.2.1" }, { value: "Subcategory 1.2.2" }] },
          ],
        },
        { value: "Category 2" },
        { value: "Category 3", children: [{ value: "Subcategory 3.1" }, { value: "Subcategory 3.2" }] },
      ];
    } else if (tag === "html") {
      data[key] = "<b>Sample HTML content</b>";
    } else if (tag === "rating") {
      data[key] = 4;
    } else if (tag === "number") {
      data[key] = 42;
    } else if (tag === "date" || tag === "datetime") {
      data[key] = new Date().toISOString();
    } else if (tag === "textarea") {
      data[key] = "Sample multiline text.";
    } else if (tag === "pairwise") {
      data[key] = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
      ];
    } else if (tag === "repeater") {
      data[key] = [{ text: "Repeat 1" }, { text: "Repeat 2" }];
    } else {
      // Patch for valueType="url"
      if (onlyUrls) {
        if (tag === "text" || tag === "hypertext") {
          data[key] = SAMPLE_WEBSITE;
        } else if (tag === "image" || tag === "hyperimage") {
          data[key] = SAMPLE_IMAGE;
        } else if (tag === "audio") {
          data[key] = SAMPLE_AUDIO;
        } else if (tag === "video") {
          data[key] = SAMPLE_VIDEO;
        } else {
          data[key] = SAMPLE_WEBSITE;
        }
      } else {
        data[key] = `Sample value for ${key}`;
      }
    }
  });

  // Return annotation if provided, else undefined
  return { id: 1, data, annotations: [{ id: 1, result: userAnnotation ? [userAnnotation] : [] }], predictions: [] };
}
