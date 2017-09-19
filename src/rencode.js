// @flow

// first bit defines type
// last bit defines length (if 16 or 'f' than it is variable length - hence it handles up to 14)
// overflow has it's own key code (STR_40 || BUF_20)
// variable length structures will have a TERM(inal) code after words (ex. string or buffer of size 23)
// Lists and Dictionaries (structures) will also have a TERM(inal) codea fter words

const LIST       = Uint8Array.from([0x01]),
      DICT       = Uint8Array.from([0x02]),
      NUM        = Uint8Array.from([0x03]),
      STR        = Uint8Array.from([0x10]),
      STR_40     = Uint8Array.from([0x20]),
      STR_64     = Uint8Array.from([0x21]),
      STR_128    = Uint8Array.from([0x22]),
      STR_256    = Uint8Array.from([0x23]),
      STR_512    = Uint8Array.from([0x24]),
      TRUE       = Uint8Array.from([0x30]),
      FALSE      = Uint8Array.from([0x31]),
      NULL       = Uint8Array.from([0x32]),
      BUF        = Uint8Array.from([0x40]),
      BUF_20     = Uint8Array.from([0x50]),
      BUF_32     = Uint8Array.from([0x51]),
      BUF_64     = Uint8Array.from([0x52]),
      BUF_128    = Uint8Array.from([0x53]),
      BUF_256    = Uint8Array.from([0x54]),
      INT_8      = Uint8Array.from([0x60]),
      INT_16LE   = Uint8Array.from([0x61]),
      INT_16BE   = Uint8Array.from([0x62]),
      INT_32LE   = Uint8Array.from([0x63]),
      INT_32BE   = Uint8Array.from([0x64]),
      INT_64LE   = Uint8Array.from([0x65]),
      INT_64BE   = Uint8Array.from([0x66]),
      U_INT_8    = Uint8Array.from([0x67]),
      U_INT_16LE = Uint8Array.from([0x68]),
      U_INT_16BE = Uint8Array.from([0x69]),
      U_INT_32LE = Uint8Array.from([0x6a]),
      U_INT_32BE = Uint8Array.from([0x6b]),
      U_INT_64LE = Uint8Array.from([0x6c]),
      U_INT_64BE = Uint8Array.from([0x6d]),
      TERM       = Uint8Array.from([0xFF]);

export function encode(input: any): Uint8Array {
  if      (input === null || input === undefined) return NULL;
  else if (input === true)                        return TRUE;
  else if (input === false)                       return FALSE;
  else if (typeof input === 'number')             return _encodeNumber(input);
  else if (typeof input === 'string')             return _encodeString(input);
  else if (Array.isArray(input))                  return new Uint8Array([LIST, input.map(item => encode(item)), TERM]);
  else if (typeof input === 'object')             return new Uint8Array([DICT, _encodeObject(input), TERM]);
  else if (Buffer.isBuffer(input))                return _encodeBuffer(input);
  else if (input instanceof Uint8Array)           return input;
  else throw "well, shucks";
}

function _encodeNumber(input: number): Uint8Array {
  let b, t;
  console.log("INPUT", input);
  if (input < 0) {
    // Signed
    if      (input >= (-127))        {t = INT_8;    b = new Buffer(1); b.writeInt8(input, 0);   } // 8
    else if (input >= (-32767))      {t = INT_16BE; b = new Buffer(2); b.writeInt16BE(input, 0);} // 16
    else if (input >= (-2147483647)) {t = INT_32BE; b = new Buffer(4); b.writeInt32BE(input, 0);} // 32
    // else                    {b = new Buffer(8); b.writeUInt64BE(input);} // 64
  } else {
    // Unsigned
    if      (input <= 255)        {t = U_INT_8;    b = new Buffer(1); b.writeUInt8(input, 0);   } // 8
    else if (input <= 65535)      {t = U_INT_16BE; b = new Buffer(2); b.writeUInt16BE(input, 0);} // 16
    else if (input <= 4294967295) {t = U_INT_32BE; b = new Buffer(4); b.writeUInt32BE(input, 0);} // 32
    // else                 b = new Buffer(8).writeInt8BE(input);  // 64
  }
  console.log("BBBBBUUUUUUFFFFFEEERRRR", b);
  return _concatBuffers(t, b);
}

function _encodeBuffer(input: Buffer): Uint8Array {
  input = new Uint8Array(input);
  if      (input.length <= 14)
    return new Uint8Array([input.length + 64, input]);
  else if (input.length === 20)  return new Uint8Array([BUF_20,  input]);
  else if (input.length === 32)  return new Uint8Array([BUF_32,  input]);
  else if (input.length === 64)  return new Uint8Array([BUF_64,  input]);
  else if (input.length === 128) return new Uint8Array([BUF_128, input]);
  else if (input.length === 256) return new Uint8Array([BUF_256, input]);
  else return new Uint8Array([BUF, input, TERM]); // TODO: buffer will have 255 in it....
}

function _encodeString(input: string): Uint8Array {
  console.log("ENCODE STRING");
  let b = Buffer.from(input);
  b     = new Uint8Array(b);
  if      (input.length <= 14)   return new Uint8Array([input.length + 16, b]);
  else if (input.length === 40)  return new Uint8Array([STR_40,  b]);
  else if (input.length === 64)  return new Uint8Array([STR_64,  b]);
  else if (input.length === 128) return new Uint8Array([STR_128, b]);
  else if (input.length === 256) return new Uint8Array([STR_256, b]);
  else if (input.length === 512) return new Uint8Array([STR_512, b]);
  else return new Uint8Array([STR, b, TERM]);
}

function _encodeObject(input: Object): Uint8Array {
  return new Uint8Array(
    Object.keys(input).map((key) => [encode(key), encode(input[key])])
  );
}

export function decode(input: Uint8Array): any {
  if      (input[0] === NULL)  return null;
  else if (input[0] === TRUE)  return true;
  else if (input[0] === FALSE) return false;
  else if (input[0] === LIST)  return _decodeList(input.slice(1));
  else if (input[0] === DICT)  return _decodeDict(input.slice(1));
  else if (input[0] >= 16 && input[0] <= 36)  return _decodeString(input);
  else if (input[0] >= 64 && input[0] <= 84)  return _decodeBuffer(input);
  else if (input[0] >= 96 && input[0] <= 109) return _decodeNumber(input);
}

function _decodeList(input: Uint8Array): Array<any> {
  return [];
}

function _decodeDict(input: Uint8Array): Object {
  return {};
}

function _decodeNumber(input: Uint8Array) {
  // INT_8      = Uint8Array.from([0x60]),
  // INT_16LE   = Uint8Array.from([0x61]),
  // INT_16BE   = Uint8Array.from([0x62]),
  // INT_32LE   = Uint8Array.from([0x63]),
  // INT_32BE   = Uint8Array.from([0x64]),
  // INT_64LE   = Uint8Array.from([0x65]),
  // INT_64BE   = Uint8Array.from([0x66]),
  // U_INT_8    = Uint8Array.from([0x67]),
  // U_INT_16LE = Uint8Array.from([0x68]),
  // U_INT_16BE = Uint8Array.from([0x69]),
  // U_INT_32LE = Uint8Array.from([0x6a]),
  // U_INT_32BE = Uint8Array.from([0x6b]),
  // U_INT_64LE = Uint8Array.from([0x6c]),
  // U_INT_64BE = Uint8Array.from([0x6d]),
}

function _decodeBuffer(input: Uint8Array) {
  // BUF        = Uint8Array.from([0x40]),
  // BUF_20     = Uint8Array.from([0x50]),
  // BUF_32     = Uint8Array.from([0x51]),
  // BUF_64     = Uint8Array.from([0x52]),
  // BUF_128    = Uint8Array.from([0x53]),
  // BUF_256    = Uint8Array.from([0x54]),
}

function _decodeString(input: Uint8Array) {
  // STR        = Uint8Array.from([0x10]),
  // STR_40     = Uint8Array.from([0x20]),
  // STR_64     = Uint8Array.from([0x21]),
  // STR_128    = Uint8Array.from([0x22]),
  // STR_256    = Uint8Array.from([0x23]),
  // STR_512    = Uint8Array.from([0x24]),
}

function _concatBuffers(buffer1: Buffer | Uint8Array, buffer2: Buffer | Uint8Array): Uint8Array {
  let uintArray = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  uintArray.set(new Uint8Array(buffer1), 0);
  uintArray.set(new Uint8Array(buffer2), buffer1.byteLength);
  return uintArray;
};
