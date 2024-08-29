import { Encoder, struct, vec, union, option, some, Decoder, tuple, ValueOf, enumUnion, enumKind } from '../src/codec';
import { expect, test } from "bun:test";

test("basic_codec", done => {
    const encoder = new Encoder(512);
    const myComplexType = struct({
        'header': struct({
            'version': 'u32',
            'length': 'u32'
        }),
        'body': struct({
            'users': vec(struct({
                'id': 'u32',
                'name': 'String'
            })),
            'type': union({
                repr: 'u8',
                0: struct({
                    'tag': 'u32',
                }),
                1: 'bool',
                10: tuple('u32', 'String'),
            })
        }),
        'ext': option('String')
    })
    let value: ValueOf<typeof myComplexType> = {
        header: { version: 1, length: 10 },
        body: {
            'users': [
                { id: 1, name: "Alice" },
                { id: 2, name: "Bob" }
            ],
            'type': {
                kind: 10,
                value: [1, "Hello"]
            },
        },
        ext: some("World")
    }
    encoder.writeRustType(myComplexType, value)
    console.log(encoder.bytes())
    let bytes = encoder.bytes();
    const decoder = new Decoder(bytes);
    const decodedValue = decoder.readRustType(myComplexType);
    expect(decodedValue).toEqual(value);
    done();
});


test("bytes_codec", done => {
    const encoder = new Encoder(4);
    enum Kind {
        A = 0,
        B = 1,
        C = 2
    }
    const myPayloadKind = enumUnion('u8', Kind);
    const myPayloadType = struct({
        'header': struct({
            'kind': myPayloadKind,
        }),
        'payload': 'Bytes'
    })
    let value: ValueOf<typeof myPayloadType> = {
        header: {
            kind: enumKind(Kind.B)
        },
        payload: new Uint8Array([1, 2, 3, 4])
    }
    encoder.writeRustType(myPayloadType, value)
    console.log(encoder.bytes())
    let bytes = encoder.bytes();
    const decoder = new Decoder(bytes);
    const decodedValue = decoder.readRustType(myPayloadType);
    expect(decodedValue).toEqual(value);
    done();
});