class Encoder {
    constructor(byteLength: number) {
        this.buffer = new ArrayBuffer(byteLength);
        this.view = new DataView(this.buffer);
    }
    private buffer: ArrayBuffer;
    private view: DataView;
    private offset: number = 0;
    private ensureCapacity(size: number) {
        if (this.offset + size > this.buffer.byteLength) {
            const newBuffer = new ArrayBuffer(this.buffer.byteLength * 2);
            new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
            this.buffer = newBuffer;
            this.view = new DataView(this.buffer);
        }
    }
    public writeUint8(value: number) {
        this.ensureCapacity(1);
        this.view.setUint8(this.offset, value);
        this.offset += 1;
    }

    public writeUint16(value: number) {
        this.ensureCapacity(2);
        this.view.setUint16(this.offset, value);
        this.offset += 2;
    }

    public writeUint32(value: number) {
        this.ensureCapacity(4);
        this.view.setUint32(this.offset, value);
        this.offset += 4;
    }

    public writeUint64(value: bigint) {
        this.ensureCapacity(8);
        this.view.setBigUint64(this.offset, value);
        this.offset += 8;
    }

    public writeInt8(value: number) {
        this.ensureCapacity(1);
        this.view.setInt8(this.offset, value);
        this.offset += 1;
    }

    public writeInt16(value: number) {
        this.ensureCapacity(2);
        this.view.setInt16(this.offset, value);
        this.offset += 2;
    }

    public writeInt32(value: number) {
        this.ensureCapacity(4);
        this.view.setInt32(this.offset, value);
        this.offset += 4;
    }

    public writeInt64(value: bigint) {
        this.ensureCapacity(8);
        this.view.setBigInt64(this.offset, value);
        this.offset += 8;
    }

    public writeFloat32(value: number) {
        this.ensureCapacity(4);
        this.view.setFloat32(this.offset, value);
        this.offset += 4;
    }

    public writeFloat64(value: number) {
        this.ensureCapacity(8);
        this.view.setFloat64(this.offset, value);
        this.offset += 8;
    }

    public writeString(value: string) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(value);
        this.writeUint32(bytes.length);
        this.ensureCapacity(bytes.length);
        new Uint8Array(this.buffer).set(bytes, this.offset);
        this.offset += bytes.length;
    }

    public writeBytes(value: Uint8Array) {
        this.writeUint32(value.length);
        this.ensureCapacity(value.length);
        new Uint8Array(this.buffer).set(value, this.offset);
        this.offset += value.length;
    }

    public writeBool(value: boolean) {
        this.writeUint8(value ? 1 : 0);
    }


}
class Decoder {
    constructor(buffer: ArrayBuffer) {
        this.data = new DataView(buffer);
    }
    private data: DataView;
    private offset: number = 0;
    public readUint8(): number {
        const value = this.data.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    public readUint16(): number {
        const value = this.data.getUint16(this.offset);
        this.offset += 2;
        return value;
    }

    public readUint32(): number {
        const value = this.data.getUint32(this.offset);
        this.offset += 4;
        return value;
    }

    public readUint64(): bigint {
        const value = this.data.getBigUint64(this.offset);
        this.offset += 8;
        return value;
    }

    public readInt8(): number {
        const value = this.data.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    public readInt16(): number {
        const value = this.data.getInt16(this.offset);
        this.offset += 2;
        return value;
    }

    public readInt32(): number {
        const value = this.data.getInt32(this.offset);
        this.offset += 4;
        return value;
    }

    public readInt64(): bigint {
        const value = this.data.getBigInt64(this.offset);
        this.offset += 8;
        return value;
    }

    public readFloat32(): number {
        const value = this.data.getFloat32(this.offset);
        this.offset += 4;
        return value;
    }

    public readFloat64(): number {
        const value = this.data.getFloat64(this.offset);
        this.offset += 8;
        return value;
    }

    public readString(): string {
        const length = this.readUint32();
        const bytes = new Uint8Array(this.data.buffer, this.offset, length);
        this.offset += length;
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    }

    public readBytes(): Uint8Array {
        const length = this.readUint32();
        const bytes = new Uint8Array(this.data.buffer, this.offset, length);
        this.offset += length;
        return bytes;
    }

    public readBool(): boolean {
        return this.readUint8() === 1;
    }
}

// interface CodecType {
//     encode(encoder: Encoder): void;
//     decode(decoder: Decoder): void;
// }

abstract class CodecType {
    abstract encode(encoder: Encoder): void;
    abstract decode(decoder: Decoder): void;
}

type EncodingNumberType = 'u8' | 'u16' | 'u32' | 'u64' | 'i8' | 'i16' | 'i32' | 'i64' | 'f32' | 'f64';
type CodecFieldProperty = { type?: EncodingNumberType, optional?: boolean }
type AutoCodecClass = {
    constructor: {
        _autoCodecFields?: ({ key: string, } & CodecFieldProperty)[]
    }
}

function CodecClass<T extends { new(...args: any[]): {} }>(constructor: T)
    : T & AutoCodecClass {
    return class extends constructor {
        encode(encoder: Encoder) {
            const fields = (this as AutoCodecClass).constructor._autoCodecFields ?? [];
            for (const field of fields) {
                const value = (this as any)[field.key];
                if (field.optional) {
                    if (value === undefined) {
                        encoder.writeUint8(0);
                        continue;
                    } else {
                        encoder.writeUint8(1);
                    }
                }
                if (typeof value === 'number') {
                    switch (field.type) {
                        case 'u8':
                            encoder.writeUint8(value);
                            break;
                        case 'u16':
                            encoder.writeUint16(value);
                            break;
                        case 'u32':
                            encoder.writeUint32(value);
                            break;
                        case 'i8':
                            encoder.writeInt8(value);
                            break;
                        case 'i16':
                            encoder.writeInt16(value);
                            break;
                        case 'i32':
                            encoder.writeInt32(value);
                            break;
                        case 'f32':
                            encoder.writeFloat32(value);
                            break;
                        case 'f64':
                            encoder.writeFloat64(value);
                            break;
                        default:
                            throw new Error('Invalid number type');
                    }
                } else if (typeof value === 'bigint') {
                    switch (field.type) {
                        case 'u64':
                            encoder.writeUint64(value);
                            break;
                        case 'i64':
                            encoder.writeInt64(value);
                            break;
                        default:
                            throw new Error('Invalid bigint type');
                    }
                } else if (typeof value === 'string') {
                    encoder.writeString(value);
                } else if (typeof value === 'boolean') {
                    encoder.writeBool(value);
                } else if (typeof value === 'undefined') {
                    // do nothing
                } else if (value instanceof Uint8Array) {
                    encoder.writeBytes(value);
                } else if (value instanceof Array) {
                    encoder.writeUint32(value.length);
                    for (const item of value) {
                        item.encode(encoder);
                    }
                } else if (value instanceof Map) {
                    encoder.writeUint32(value.size);
                    for (const [key, item] of value) {
                        encoder.writeString(key);
                        item.encode(encoder);
                    }
                } else if (value instanceof Set) {
                    encoder.writeUint32(value.size);
                    for (const item of value) {
                        item.encode(encoder);
                    }
                } else if (value instanceof CodecType) {
                    value.encode(encoder);
                } else {
                    throw new Error('Invalid type');
                }
            }
        }

        decode(decoder: Decoder) {
            const fields = (this.constructor as any)._autoCodecFields || [];
            for (const field of fields) {
                switch (field.type) {
                    case 'u8':
                        (this as any)[field.key] = decoder.readUint8();
                        break;
                    case 'u16':
                        (this as any)[field.key] = decoder.readUint16();
                        break;
                    case 'u32':
                        (this as any)[field.key] = decoder.readUint32();
                        break;
                    case 'f64':
                        (this as any)[field.key] = decoder.readFloat64();
                        break;
                }
            }
        }
    }
}


function CodecField(options?: CodecFieldProperty) {
    return function (this: any, propertyKey: string,) {
        if (!this.constructor._autoCodecFields) {
            this.constructor._autoCodecFields = [];
        }
        this.constructor._autoCodecFields.push({ key: propertyKey, ...options });
        return this[propertyKey]
    };
}


abstract class ByteEnum implements CodecType {
    private byte: number;
    constructor(value: number) {
        this.byte = value;
    }
    encode(encoder: Encoder) {
        encoder.writeUint8(this.byte);
    }
    decode(decoder: Decoder) {
        this.byte = decoder.readUint8();
    }
}

class ExpectAckKind extends ByteEnum {
    public static readonly Sent: ExpectAckKind = new ExpectAckKind(0x00);
    public static readonly Received: ExpectAckKind = new ExpectAckKind(0x01);
    public static readonly Processed: ExpectAckKind = new ExpectAckKind(0x02);
}

@CodecClass
class TestHeader extends CodecType {
    encode(encoder: Encoder): void {
        throw new Error("Method not implemented.");
    }
    decode(decoder: Decoder): void {
        throw new Error("Method not implemented.");
    }

    @CodecField
    public name: string;
    constructor(name: string) {
        super();
        this.name = name;
    }
}

const encoder = new Encoder(1024);

let header = new TestHeader("test");
header.encode(encoder);