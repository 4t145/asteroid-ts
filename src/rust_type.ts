

export type RustPrimitive = RustNumber | 'bool' | 'char' | 'String' | 'Bytes' | RustUnit

export type RustSign = 'i' | 'u'
export type RustIntSize = 8 | 16 | 32 | 64 | 128
export type RustFloatSize = 32 | 64

export type RustInteger = `${RustSign}${RustIntSize}`
export type RustFloat = `f${RustFloatSize}`
export type RustNumber = RustInteger | RustFloat

export type RustUnit = '()'

export type RustEnum = {
    [variant: number]: RustType;
    repr: RustInteger
}

export type RustSumType = {
    [variant: number]: RustType;
    repr: RustInteger
}

export type RustProdType = RustType[]

export type RustStruct = {
    [field: number]: RustType;
}

export type RustArray = {
    type: RustType;
    size: number;
}

export type RustTuple = RustType[]
export type RustSequence = {
    type: RustType;
    lengthType: RustInteger;
}

export type RustGeneric = (...types: RustType[]) => RustType
export type RustType = RustPrimitive | RustProdType | RustSumType | RustSequence
export namespace RustType {
    export const isNumber = (type: RustType): type is RustNumber => {
        return typeof type === 'string' && (type.startsWith('i') || type.startsWith('u') || type.startsWith('f'))
    }
    export const isPrimitive = (type: RustType): type is RustPrimitive => {
        return typeof type === 'string'
    }
    export const isString = (type: RustType): type is 'String' => {
        return type === 'String'
    }
    export const isBytes = (type: RustType): type is 'Bytes' => {
        return type === 'Bytes'
    }
    export const isProd = (type: RustType): type is RustProdType => {
        return Array.isArray(type)
    }
    export const isSum = (type: RustType): type is RustSumType => {
        return typeof type === 'object' && 'repr' in type
    }
    export const isSeq = (type: RustType): type is RustSequence => {
        return typeof type === 'object' && 'lengthType' in type
    }

}


export const prod = (...types: RustType[]): RustProdType => types
export const sum = (repr: RustInteger, ...types: RustType[]): RustSumType => ({ repr, ...types })

export const tuple = prod
export const struct = prod

export const array = (type: RustType, size: number): RustProdType => (Array(size).fill(type))
export const result = (ok: RustType, err: RustType): RustEnum => ({ 0: ok, 1: err, repr: 'u8' })
export const option = (type: RustType): RustEnum => ({ 0: type, 1: '()', repr: 'u8' })
export const sequence = (type: RustType, lengthType: RustInteger): RustSequence => ({ type, lengthType })
export const vec: RustGeneric = (type: RustType): RustSequence => (sequence(type, 'u32'))
export const map: RustGeneric = (key: RustType, value: RustType) => (sequence(prod(key, value), 'u32'))
export const set: RustGeneric = (type: RustType) => (sequence(type, 'u32'))
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

    public writeRustType(type: RustType, value: any) {

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

    public readRustType(type: RustType): any {
        if (RustType.isPrimitive(type)) {
            if (RustType.isNumber(type)) {
                switch (type) {
                    case 'i8': return this.readInt8();
                    case 'i16': return this.readInt16();
                    case 'i32': return this.readInt32();
                    case 'i64': return this.readInt64();
                    case 'u8': return this.readUint8();
                    case 'u16': return this.readUint16();
                    case 'u32': return this.readUint32();
                    case 'u64': return this.readUint64();
                    case 'f32': return this.readFloat32();
                    case 'f64': return this.readFloat64();
                }
            } else if (type === 'bool') {
                return this.readBool();
            } else if (type === 'char') {
                throw new Error('Not implemented');
            } else if (type === 'String') {
                return this.readString();
            } else if (type === 'Bytes') {
                return this.readBytes();
            } else if (type === '()') {
                return {};
            }
        } else if (RustType.isProd(type)) {
            return type.map(t => this.readRustType(t));
        } else if (RustType.isSum(type)) {
            const tag = this.readRustType(type.repr);
            return this.readRustType(type[tag]);
        }
    }
}