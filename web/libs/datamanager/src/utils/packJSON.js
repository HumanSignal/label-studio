/** @deprecated Buggy legacy library, don't use it. Use utils/urlJSON instead. */

const CODES = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-.";
// Not used symbols _!~*'()
const NUM_CODES = "0123456789.e+-";
const NUM_CODES_SIZE = Math.ceil(Math.log(NUM_CODES.length) / Math.log(2));

const MAX_INT_SIZE = Math.log(Number.MAX_SAFE_INTEGER) / Math.log(2);

function NumberToBytes(val) {
  return new Uint8Array(new Float64Array([val]).buffer, 0, 8);
}
function NumberFromBytes(val) {
  return new Float64Array(new Uint8Array(val).buffer, 0, 1)[0];
}

function PackJSONBuffer(domain = CODES) {
  this.domain = domain;
  this.bufferCellSize = Math.floor(Math.log(domain.length) / Math.log(2));
  this.clear();
}
Object.defineProperty(PackJSONBuffer.prototype, "lastCell", {
  get() {
    return this.buffer[this.buffer.length - 1];
  },
  set(val) {
    this.buffer[this.buffer.length - 1] = val;
  },
});
PackJSONBuffer.prototype.MAX_INT_CHUNK_SIZE = 30;
PackJSONBuffer.prototype.pushChunk = function (size, val) {
  if (this.readonly) throw Error("Cannot push the chunk. The value is readonly");
  while (size > 0) {
    if (this.avaliableBufferCellSize === 0) {
      this.buffer.push(0);
      this.avaliableBufferCellSize = this.bufferCellSize;
    }
    if (this.avaliableBufferCellSize >= size) {
      this.lastCell |= ((1 << this.bufferCellSize) - 1) & (val << (this.avaliableBufferCellSize -= size));
      size = 0;
    } else {
      this.lastCell |= ((1 << this.bufferCellSize) - 1) & (val >> (size -= this.avaliableBufferCellSize));
      this.avaliableBufferCellSize = 0;
    }
  }
};
PackJSONBuffer.prototype.readChunk = function (size) {
  if (size > this.MAX_INT_CHUNK_SIZE)
    throw Error(`Unsupported size of a chunk. Couldn't be greater than ${this.MAX_INT_CHUNK_SIZE}`);
  let chunk = 0;
  let cellIdx;
  let cellPos;
  let cellValueSize;
  let cellValue;

  while (size > 0) {
    cellPos = this.pos % this.bufferCellSize;
    cellIdx = (this.pos - cellPos) / this.bufferCellSize;
    cellValueSize = this.bufferCellSize - cellPos;
    cellValue = this.buffer[cellIdx] & ((1 << cellValueSize) - 1);
    chunk = (chunk << Math.min(cellValueSize, size)) | (cellValue >> Math.max(cellValueSize - size, 0));
    this.pos += Math.min(cellValueSize, size);
    size -= cellValueSize;
  }
  return chunk;
};
PackJSONBuffer.prototype.seek = function (pos) {
  this.pos = pos;
};
PackJSONBuffer.prototype.readBytes = function (length) {
  return new Uint8Array(length).map(() => this.readChunk(8));
};
PackJSONBuffer.prototype.clear = function () {
  this.buffer = [];
  this.avaliableBufferCellSize = 0;
  this.readonly = false;
  this.pos = 0;
};
PackJSONBuffer.prototype.toString = function () {
  return this.buffer.map((domainIdx) => this.domain[domainIdx]).join("");
};
PackJSONBuffer.prototype.fromString = function (string) {
  this.buffer = string.split("").map((char) => this.domain.indexOf(char));
  this.readonly = true;
  this.pos = 0;
};
PackJSONBuffer.fromString = (string, domain) => new PackJSONBuffer(domain).fromString(string);

/*
body:= [...value]
value :=
  0 spec [0:stop]|[1:true]|[2:false][3:null]
  1 number [0:float]|[1:int]|[2:string]
? 2 string [type][[0:[...[char]|[[.][string_code]]]|[1:...[string_code]]|[2:...[[0:isChar][char]|[1:isCode][string_code]]]]
  3 array [...[value]][0:stop]
  4 object [...[[value:key][value:value]]][0:stop]
  5 definitions
  6 const [value]

definitions:=
   1 dictionary [...bodyValues] (getting by idx)
 */

const CODE_SIZE = 3;

const SPEC_CODE = 0;
const SPEC_LITERALS = [undefined, true, false, null];
const SPEC_SIZE = (SPEC_LITERALS.length - 1).toString(2).length;

const NUMBER_CODE = 1;
const NUMBER_TYPE_SIZE = 2;
const NUMBER_FLOAT_TYPE = 0;
const NUMBER_INTEGER_TYPE = 1;
const NUMBER_STRING_TYPE = 2;

const STRING_CODE = 2;
const STRING_LEN_BLOCK_SIZE = 4;
const STRING_TYPE_SIZE = 3; // with a future potential
const INFREQUENT_CODES_STRING_TYPE = 0;
const ONLY_CODES_STRING_TYPE = 1;
const MARKED_CHARS_STRING_TYPE = 2;

const ARRAY_CODE = 3;

const OBJECT_CODE = 4;

const DEFINITION_CODE = 5;
const DEFINITION_TYPE_SIZE = 2;
const DICT_DEFINITION_TYPE = 1;

const CONST_CODE = 6;

const PackJSON = function (domain) {
  this.buffer = new PackJSONBuffer(domain);
};

PackJSON.prototype.stringify = function (json) {
  this.buffer.clear();
  this.makeDictionaries(json);
  this.encode(json);
  return this.buffer.toString();
};
PackJSON.prototype.parse = function (string) {
  this.buffer.fromString(string);
  this.definitions = [];
  return this.decode();
};
PackJSON.prototype.makeDictionaries = function (json) {
  this.sharedValuesCount = 0;
  this.sharedNumbersDict = {};
  this.sharedStringsDict = {};
  this.tmpSharedValuesSet = new Set();
  this.collectObjectWords(json);
  this.encodeDefinitions();
};
PackJSON.prototype.collectObjectWords = function (value) {
  switch (typeof value) {
    case "number": {
      if (this.tmpSharedValuesSet.has(value) && this.sharedStringsDict[value] === undefined) {
        this.sharedNumbersDict[value] = this.sharedValuesCount++;
      }
      this.tmpSharedValuesSet.add(value);
      break;
    }
    case "string": {
      if (this.tmpSharedValuesSet.has(value) && this.sharedStringsDict[value] === undefined) {
        this.sharedStringsDict[value] = this.sharedValuesCount++;
      }
      this.tmpSharedValuesSet.add(value);
      break;
    }
    case "object": {
      if (value === null) return;
      if (Array.isArray(value)) {
        value.forEach((v) => this.collectObjectWords(v));
      } else {
        for (const [key, val] of Object.entries(value)) {
          this.collectObjectWords(key);
          this.collectObjectWords(val);
        }
      }
      break;
    }
  }
};
PackJSON.prototype.encode = function (value) {
  const type = typeof value;

  switch (type) {
    case "boolean": {
      this.encodeSpec(value);
      break;
    }
    case "number": {
      this.encodeNumber(value);
      break;
    }
    case "string": {
      this.encodeString(value);
      break;
    }
    case "object": {
      if (value === null) {
        this.encodeSpec(value);
      } else if (Array.isArray(value)) {
        this.encodeArray(value);
      } else {
        this.encodeObject(value);
      }
      break;
    }
  }
};
PackJSON.prototype.decode = function () {
  const code = this.buffer.readChunk(CODE_SIZE);

  switch (code) {
    case SPEC_CODE: {
      return this.decodeSpec();
    }
    case NUMBER_CODE: {
      return this.decodeNumber();
    }
    case STRING_CODE: {
      return this.decodeString();
    }
    case ARRAY_CODE: {
      return this.decodeArray();
    }
    case OBJECT_CODE: {
      return this.decodeObject();
    }
    case DEFINITION_CODE: {
      return this.decodeDefinitions();
    }
    case CONST_CODE: {
      return this.decodeConst();
    }
  }
};
PackJSON.prototype.encodeSpec = function (value) {
  this.buffer.pushChunk(CODE_SIZE, SPEC_CODE);
  this.buffer.pushChunk(SPEC_SIZE, SPEC_LITERALS.indexOf(value));
};
PackJSON.prototype.decodeSpec = function () {
  return SPEC_LITERALS[this.buffer.readChunk(SPEC_SIZE)];
};

PackJSON.prototype.encodeNumber = function (value) {
  if (this.definitions?.indexOf(value) > -1) {
    return this.encodeConst(this.sharedNumbersDict[value]);
  }
  this.buffer.pushChunk(CODE_SIZE, NUMBER_CODE);
  if (Number.isInteger(value)) {
    this.buffer.pushChunk(NUMBER_TYPE_SIZE, NUMBER_INTEGER_TYPE);
    this.buffer.pushChunk(1, value < 0);
    value = Math.abs(value);
    this.buffer.pushChunk(MAX_INT_SIZE.toString(2).length, value.toString(2).length);
    value
      .toString(32)
      .split("")
      .forEach((b32, idx) => {
        const val = Number.parseInt(b32, 32);

        this.buffer.pushChunk(idx ? 5 : val.toString(2).length, val);
      });
  } else {
    const stringValue = JSON.stringify(value);

    if (stringValue.length * NUM_CODES_SIZE < 64) {
      this.buffer.pushChunk(NUMBER_TYPE_SIZE, NUMBER_STRING_TYPE);
      this.buffer.pushChunk((64 / NUM_CODES_SIZE - 1).toString(2).length, stringValue.length);
      stringValue.split("").forEach((ch) => {
        this.buffer.pushChunk(NUM_CODES_SIZE, NUM_CODES.indexOf(ch));
      });
    } else {
      const bytes = NumberToBytes(value);

      this.buffer.pushChunk(NUMBER_TYPE_SIZE, NUMBER_FLOAT_TYPE);
      bytes.forEach((byte) => this.buffer.pushChunk(8, byte));
    }
  }
};
PackJSON.prototype.decodeNumber = function () {
  const type = this.buffer.readChunk(NUMBER_TYPE_SIZE);

  switch (type) {
    case NUMBER_INTEGER_TYPE: {
      const sign = this.buffer.readChunk(1);
      const size = this.buffer.readChunk(MAX_INT_SIZE.toString(2).length);
      const b32 = Array.apply(null, new Array(Math.ceil(size / 5)))
        .map((v, idx) => this.buffer.readChunk(idx ? 5 : size % 5 || 5).toString(32))
        .join("");

      return (sign ? -1 : 1) * Number.parseInt(b32, 32);
    }
    case NUMBER_STRING_TYPE: {
      const length = this.buffer.readChunk((64 / NUM_CODES_SIZE - 1).toString(2).length);

      return JSON.parse(
        Array.apply(null, new Array(length))
          .map(() => NUM_CODES[this.buffer.readChunk(NUM_CODES_SIZE)])
          .join(""),
      );
    }
    case NUMBER_FLOAT_TYPE: {
      const bytes = this.buffer.readBytes(8);

      return NumberFromBytes(bytes);
    }
  }
};

PackJSON.prototype.encodeString = function (value) {
  if (this.definitions?.indexOf(value) > -1) {
    return this.encodeConst(this.sharedStringsDict[value]);
  }
  value = this.packInConstants(value);
  this.buffer.pushChunk(CODE_SIZE, STRING_CODE);
  const knownCharsCount = value.split("").filter((ch) => {
    const idx = CODES.indexOf(ch);

    return idx > -1 && idx < CODES.length - 1;
  }).length;
  const unknownCharsCount = value.length - knownCharsCount;
  const potentialInfrequentCharsStringSize = knownCharsCount * 6 + unknownCharsCount * (6 + 16);
  const potentialOnlyCodesStringSize = value.length * 16;
  const potentialMarkedCharsStringSize = knownCharsCount * 7 + unknownCharsCount * 17;
  const minSize = Math.min(
    potentialInfrequentCharsStringSize,
    potentialOnlyCodesStringSize,
    potentialMarkedCharsStringSize,
  );

  switch (minSize) {
    case potentialInfrequentCharsStringSize: {
      this.buffer.pushChunk(STRING_TYPE_SIZE, INFREQUENT_CODES_STRING_TYPE);
      this.encodeStringLen(value);
      value.split("").forEach((ch) => {
        const idx = CODES.indexOf(ch);

        if (idx > -1 && idx < CODES.length - 1) {
          this.buffer.pushChunk(6, idx);
        } else {
          this.buffer.pushChunk(6, CODES.length - 1);
          this.buffer.pushChunk(16, ch.charCodeAt(0));
        }
      });
      break;
    }
    case potentialOnlyCodesStringSize: {
      this.buffer.pushChunk(STRING_TYPE_SIZE, ONLY_CODES_STRING_TYPE);
      this.encodeStringLen(value);
      value.split("").forEach((ch) => {
        this.buffer.pushChunk(16, ch.charCodeAt(0));
      });
      break;
    }
    case potentialMarkedCharsStringSize: {
      this.buffer.pushChunk(STRING_TYPE_SIZE, MARKED_CHARS_STRING_TYPE);
      this.encodeStringLen(value);
      value.split("").forEach((ch) => {
        const idx = CODES.indexOf(ch);

        if (idx > -1) {
          this.buffer.pushChunk(1, 0);
          this.buffer.pushChunk(6, idx);
        } else {
          this.buffer.pushChunk(1, 1);
          this.buffer.pushChunk(16, ch.charCodeAt(0));
        }
      });
      break;
    }
  }
};
PackJSON.prototype.encodeStringLen = function (value) {
  const stringLengthParts = value.length.toString(1 << STRING_LEN_BLOCK_SIZE).split("");

  stringLengthParts.forEach((lenBlock, idx) => {
    this.buffer.pushChunk(STRING_LEN_BLOCK_SIZE, Number.parseInt(lenBlock, 1 << STRING_LEN_BLOCK_SIZE));
    this.buffer.pushChunk(1, idx === stringLengthParts.length - 1); // stop chain marker
  });
};

PackJSON.prototype.decodeString = function () {
  const value = this._decodeString();

  return this.resolveConstants(value);
};

PackJSON.prototype._decodeString = function () {
  const stingType = this.buffer.readChunk(STRING_TYPE_SIZE);

  switch (stingType) {
    case INFREQUENT_CODES_STRING_TYPE: {
      const length = this.decodeStringLen();

      return Array.apply(null, new Array(length))
        .map(() => {
          const idx = this.buffer.readChunk(6);

          if (idx > -1 && idx < CODES.length - 2) {
            return CODES[idx];
          }
          if (idx === CODES.length - 1) {
            return String.fromCharCode(this.buffer.readChunk(16));
          }
        })
        .join("");
    }
    case ONLY_CODES_STRING_TYPE: {
      const length = this.decodeStringLen();

      return Array.apply(null, new Array(length))
        .map(() => String.fromCharCode(this.buffer.readChunk(16)))
        .join("");
    }
    case MARKED_CHARS_STRING_TYPE: {
      const length = this.decodeStringLen();

      return Array.apply(null, new Array(length))
        .map(() => {
          const isCode = this.buffer.readChunk(1);

          if (!isCode) {
            return CODES[this.buffer.readChunk(6)];
          }
          return String.fromCharCode(this.buffer.readChunk(16));
        })
        .join("");
    }
  }
};
PackJSON.prototype.decodeStringLen = function () {
  const stringLengthParts = [];
  let shouldStop = false;

  do {
    stringLengthParts.push(this.buffer.readChunk(STRING_LEN_BLOCK_SIZE).toString(1 << STRING_LEN_BLOCK_SIZE));
    shouldStop = this.buffer.readChunk(1);
  } while (!shouldStop);
  return Number.parseInt(stringLengthParts.join(""), 1 << STRING_LEN_BLOCK_SIZE);
};

PackJSON.prototype.packInConstants = function (value) {
  const re = /\./g;

  value = value.replace(re, ".-");
  this.definitions.forEach((definition, idx) => {
    const re = new RegExp(definition, "g");

    value = value.replace(re, `.${idx}`);
  });
  return value;
};

PackJSON.prototype.resolveConstants = function (value) {
  this.definitions.forEach((definition, idx) => {
    const re = new RegExp(`\\.${idx}`, "g");

    value = value.replace(re, definition);
  });
  const re = /\.-/g;

  value = value.replace(re, ".");
  return value;
};

PackJSON.prototype.pushStopCode = function () {
  this.buffer.pushChunk(CODE_SIZE, SPEC_CODE);
  this.buffer.pushChunk(SPEC_SIZE, 0);
};

PackJSON.prototype.encodeArray = function (value) {
  this.buffer.pushChunk(CODE_SIZE, ARRAY_CODE);
  const len = value.length;

  for (let i = 0; i < len; i++) {
    this.encode(value[i]);
  }
  this.pushStopCode();
};

PackJSON.prototype.decodeArray = function () {
  const res = [];

  while (!(this.buffer.readChunk(CODE_SIZE + SPEC_SIZE) === 0)) {
    this.buffer.seek(this.buffer.pos - (CODE_SIZE + SPEC_SIZE));
    res.push(this.decode());
  }
  return res;
};

PackJSON.prototype.encodeObject = function (value) {
  this.buffer.pushChunk(CODE_SIZE, OBJECT_CODE);
  for (const [key, val] of Object.entries(value)) {
    this.encode(key);
    this.encode(val);
  }
  this.pushStopCode();
};

PackJSON.prototype.decodeObject = function () {
  const res = {};

  while (!(this.buffer.readChunk(CODE_SIZE + SPEC_SIZE) === 0)) {
    this.buffer.seek(this.buffer.pos - (CODE_SIZE + SPEC_SIZE));
    res[this.decode()] = this.decode();
  }
  return res;
};

PackJSON.prototype.encodeDefinitions = function () {
  const definitions = [];

  this.definitions = [];
  [this.sharedNumbersDict, this.sharedStringsDict].forEach((dictionary) => {
    Object.entries(dictionary).forEach(([value, idx]) => {
      definitions[idx] = value;
    });
  });
  if (!definitions.length) return;
  this.buffer.pushChunk(CODE_SIZE, DEFINITION_CODE);
  this.buffer.pushChunk(DEFINITION_TYPE_SIZE, DICT_DEFINITION_TYPE);
  this.definitionIndexSize = Math.ceil(Math.log(definitions.length) / Math.log(2));
  definitions.forEach((definition) => {
    this.encode(definition);
  });
  this.definitions = definitions;
  this.pushStopCode();
};

PackJSON.prototype.decodeDefinitions = function () {
  this.buffer.readChunk(DEFINITION_TYPE_SIZE);
  while (!(this.buffer.readChunk(CODE_SIZE + SPEC_SIZE) === 0)) {
    this.buffer.seek(this.buffer.pos - (CODE_SIZE + SPEC_SIZE));
    this.definitions.push(this.decode());
  }
  this.definitionIndexSize = Math.ceil(Math.log(this.definitions.length) / Math.log(2));
  // decode next as if there weren't any definitions
  return this.decode();
};

PackJSON.prototype.encodeConst = function (idx) {
  this.buffer.pushChunk(CODE_SIZE, CONST_CODE);
  this.buffer.pushChunk(this.definitionIndexSize, idx);
};

PackJSON.prototype.decodeConst = function () {
  const definitionIndex = this.buffer.readChunk(this.definitionIndexSize);

  return this.definitions[definitionIndex];
};

const packJSON = new PackJSON();

export { PackJSON, packJSON };
