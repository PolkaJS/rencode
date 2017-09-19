const test = require('tape');
const { encode, decode } = require('../lib/rencode.js');

test('rencode encode a u8 number', function (t) {
    t.plan(2);

    let x = encode(5);
    t.equal(x[0], 103, "encode the number 5 -> first bit 103 (primitive U_INT_8)");
    t.equal(x[1], 5,   "encode the number 5 -> second bit 5 (actual number)");
});

test('rencode encode a negative i8 number', function (t) {
    t.plan(2);

    let x = encode((-5));
    t.equal(x[0], 96,  "encode the number 5 -> first bit 96 (primitive U_INT_8)");
    t.equal(x[1], 251, "encode the number 5 -> second bit 5 (actual number)");
});

test('rencode encode a u16 number', function (t) {
    t.plan(3);

    let x = encode(65535);
    t.equal(x[0], 105, "encode the number 65535 -> first bit 105 (primitive U_INT_16BE)");
    t.equal(x[1], 255, "encode the number 65535 -> second bit 255 (actual number)");
    t.equal(x[2], 255, "encode the number 65535 -> third bit 255 (actual number)");
});

test('rencode encode a negative i16 number', function (t) {
    t.plan(3);

    let x = encode((-32767));
    t.equal(x[0], 98,  "encode the number -32767 -> first bit 98 (primitive INT_16BE)");
    t.equal(x[1], 255, "encode the number -32767 -> second bit 5 (actual number)");
    t.equal(x[2], 255, "encode the number -32767 -> second bit 5 (actual number)");
});
