

export type RustPrimitive = RustNumber | 'bool' | 'char' | 'String' | 'Bytes' | RustUnit

export type RustSign = 'i' | 'u'
export type RustIntSize = 8 | 16 | 32 | 64
export type RustFloatSize = 32 | 64

export type RustInteger = `${RustSign}${RustIntSize}`
export type RustSmallInteger = `${'i' | 'u'}${8 | 16 | 32}`
export type RustNumberType = `${'i' | 'u'}${8 | 16 | 32}` | 'f32' | 'f64'
export type RustFloat = `f${RustFloatSize}`
export type RustNumber = RustInteger | RustFloat

export type RustUnit = '()'


export type RustSumType = {
    [variant: number]: RustType;
    repr: RustSmallInteger
}

export type RustEnum = RustSumType

export type RustProdType = RustTuple | RustStruct

export type RustStruct = {
    [field: string]: RustType;
}
export type RustTuple = RustType[]
export type RustArray = {
    type: RustType;
    size: number;
}
export type RustGenericSequence<T extends RustType> = {
    type: T;
    lengthType: RustSmallInteger;
}
export type RustSequence = {
    type: RustType;
    lengthType: RustSmallInteger;
}


export type RustGeneric = (...types: RustType[]) => RustType
export type RustType = RustPrimitive | RustProdType | RustSumType | RustSequence


export namespace RustType {
    export const isNumber = (type: RustType): type is RustNumber => {
        return typeof type === 'string' && (type.startsWith('i') || type.startsWith('u') || type.startsWith('f'))
    }
    export const isSmallInteger = (type: RustType): type is RustNumber => {
        return isNumber(type) && !type.endsWith('64') && !type.startsWith('f')
    }
    export const isPrimitive = (type: RustType): type is RustPrimitive => {
        return typeof type === 'string'
    }
    export const isBool = (type: RustType): type is 'bool' => {
        return type === 'bool'
    }
    export const isString = (type: RustType): type is 'String' => {
        return type === 'String'
    }
    export const isBytes = (type: RustType): type is 'Bytes' => {
        return type === 'Bytes'
    }
    export const isUnit = (type: RustType): type is '()' => {
        return type === '()'
    }
    export const isSum = (type: RustType): type is RustSumType => {
        return typeof type === 'object' && 'repr' in type
    }
    export const isSeq = (type: RustType): type is RustSequence => {
        return typeof type === 'object' && 'lengthType' in type
    }
    export const isProd = (type: RustType): type is RustProdType => {
        return typeof type === 'object' && !isSum(type) && !isSeq(type)
    }
    export const isStruct = (type: RustType): type is RustStruct => {
        return isProd(type) && !isTuple(type)
    }
    export const isTuple = (type: RustType): type is RustTuple => {
        return Array.isArray(type)
    }
}


export type RustValue = RustEnumValue | RustStructValue | RustTupleValue | RustSeqValue | RustBoolValue | RustNumberValue | RustBitIntValue | RustBytesValue;


export type ValueOf<T extends RustType> =
    T extends `${'i' | 'u'}${8 | 16 | 32}` | 'f32' | 'f64' ? RustNumberValue :
    T extends 'i64' | 'u64' ? RustBitIntValue :
    T extends 'bool' ? boolean :
    T extends 'String' ? RustStringValue :
    T extends 'Bytes' ? RustBytesValue :
    T extends '()' ? {} :
    T extends RustGenericSequence<infer E> ? ValueOf<E>[] :
    T extends RustSumType ? {
        [K in keyof T]: K extends number ? { kind: K, value: ValueOf<T[K]> } : never
    }[keyof T] :
    T extends RustStruct ? {
        [F in keyof T]: ValueOf<T[F]>
    } :
    T extends [] ? [] :
    T extends [infer A extends RustType, ...infer B extends RustType[]] ? [ValueOf<A>, ...ValueOf<B>] :
    never;

export type TypeOf<V> = V extends ValueOf<infer T> ? T : never

export type RustEnumValue = {
    kind: number,
    value: RustValue
}
export type RustStructValue = {
    [field: string]: RustValue
}
export type RustTupleValue = RustValue[]
export type RustSeqValue = RustValue[]
export type RustBoolValue = boolean
export type RustNumberValue = number
export type RustBitIntValue = bigint
export type RustStringValue = string
export type RustBytesValue = Uint8Array

export type RustResult<T extends RustType, E extends RustType> = {
    0: T,
    1: E,
    repr: 'u8'
}

export type RustOption<T extends RustType> = {
    0: '()',
    1: T,
    repr: 'u8'
}
export const Ok = 0;
export const Err = 1;
export const ok = <T>(value: T) => variant(Ok, value)
export const err = <E>(value: E) => variant(Err, value)

export const None = 0;
export const Some = 1;
export const some = <T>(value: T) => variant(Some, value)
export const none = () => variant(None, {})

export const sum = (repr: RustSmallInteger, ...types: RustType[]): RustSumType => ({ repr, ...types })
export const union = <T extends RustEnum>(type: T): T => {
    return type
}

export const enumUnion = <E extends { [key: string | number]: number | string }, R extends RustSmallInteger>(repr: R, kinds: E): {
    [K in Exclude<E[keyof E], string>]: '()'
} & {
    repr: R
} => {
    let type = <RustEnum>{
        repr,
    }
    for (const key in Object.keys(kinds)) {
        const kind = kinds[key]
        console.debug(`kind`, kind)
        console.debug(`key`, key)
        console.debug(`typeof key`, typeof key)
        try {
            let numberKey = Number.parseInt(key)

            if (typeof numberKey === 'number') {
                type[numberKey] = '()'
            }
        } catch {
            
        }
    }
    return (type as any)
}
export const variant = <K extends number, V>(kind: K, value: V) => ({
    kind, value
})
export const enumKind = <K extends number>(kind: K) => ({
    kind, value: {}
})
export const tuple = <T extends RustType[]>(...types: T): T => types

export const result = <T extends RustType, E extends RustType>(ok: T, err: E): RustResult<T, E> => ({ [Ok]: ok, [Err]: err, repr: 'u8' })
export const option = <T extends RustType>(type: T): RustOption<T> => ({ [Some]: type, [None]: '()', repr: 'u8' })
export const struct = <T extends RustStruct>(type: T): T => (type)
export const sequence = <T extends RustType>(type: T, lengthType: RustSmallInteger): RustGenericSequence<T> => ({ type, lengthType })
export const vec = <T extends RustType>(type: T): RustGenericSequence<T> => ({ type, lengthType: 'u32' })
export const map = <K extends RustType, V extends RustType>(key: K, value: V): RustGenericSequence<[K, V]> => (sequence([key, value], 'u32'))
export const set = <K extends RustType>(type: K) => (sequence(type, 'u32'))
export class Encoder {
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
    public reset() {
        this.offset = 0
    }
    public bytes(): ArrayBuffer {
        return this.buffer.slice(0, this.offset)
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

    public writeRustType<T extends RustType>(type: T, value: ValueOf<T>) {
        console.debug(`writeRustType`, type, value)
        console.debug(`bytes`, this.bytes())
        if (RustType.isNumber(type)) {
            if (typeof value === 'number') {
                switch (type) {
                    case "i8": this.writeInt8(value)
                        break;
                    case "i16": this.writeInt16(value)
                        break;
                    case "i32": this.writeInt32(value)
                        break;
                    case "u8": this.writeUint8(value)
                        break;
                    case "u16": this.writeUint16(value)
                        break;
                    case "u32": this.writeUint32(value)
                        break;
                    case "f32": this.writeFloat32(value)
                        break;
                    case "f64": this.writeFloat64(value)
                        break;
                    default: throw Error(`type ${type} is not a number type`)
                }
            } else if (typeof value === 'bigint') {
                switch (type) {
                    case 'i64': this.writeInt64(value); break;
                    case 'u64': this.writeUint64(value); break;
                    default: throw Error(`type ${type} is not a bigint type`)
                }
            } else {
                throw Error(`${value} don't have a type of ${type}`)
            }
        } else if (RustType.isBool(type)) {
            this.writeBool(<ValueOf<'bool'>>value)
        } else if (RustType.isStruct(type)) {
            for (const key in type) {
                this.writeRustType((type)[key], (<any>value)[key])
            }
        } else if (RustType.isSum(type)) {
            this.writeRustType(type.repr, (<ValueOf<RustSumType>>value).kind)
            this.writeRustType(type[(<ValueOf<RustSumType>>value).kind], (<ValueOf<RustSumType>>value).value)
        } else if (RustType.isUnit(type)) {
            // skip
        } else if (RustType.isString(type)) {
            this.writeString(<ValueOf<'String'>>value)
        } else if (RustType.isBytes(type)) {
            this.writeBytes(<ValueOf<'Bytes'>>value)
        } else if (RustType.isSeq(type)) {
            const length = (<ValueOf<RustSequence>>value).length;
            this.writeRustType(type.lengthType, length)
            for (let index = 0; index < length; index += 1) {
                this.writeRustType(type.type, (<ValueOf<RustSequence>>value)[index])
            }
        } else if (RustType.isTuple(type)) {
            for (let index = 0; index < type.length; index += 1) {
                this.writeRustType(type[index], (<ValueOf<RustTuple>>value)[index])
            }
        } else {
            throw Error(`unknown rust type ${type}`)
        }
    }
}
export class Decoder {
    constructor(buffer: ArrayBuffer) {
        this.data = new DataView(buffer);
    }
    private data: DataView;
    private offset: number = 0;
    public load(buffer: ArrayBuffer) {
        this.data = new DataView(buffer);
        this.offset = 0;
    }
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

    public readRustType<T extends RustType>(type: T): ValueOf<T> {
        if (RustType.isPrimitive(type)) {
            if (RustType.isNumber(type)) {
                switch (type) {
                    case 'i8': return <ValueOf<T>>this.readInt8();
                    case 'i16': return <ValueOf<T>>this.readInt16();
                    case 'i32': return <ValueOf<T>>this.readInt32();
                    case 'i64': return <ValueOf<T>>this.readInt64();
                    case 'u8': return <ValueOf<T>>this.readUint8();
                    case 'u16': return <ValueOf<T>>this.readUint16();
                    case 'u32': return <ValueOf<T>>this.readUint32();
                    case 'u64': return <ValueOf<T>>this.readUint64();
                    case 'f32': return <ValueOf<T>>this.readFloat32();
                    case 'f64': return <ValueOf<T>>this.readFloat64();
                }
            } else if (type === 'bool') {
                return <ValueOf<T>>this.readBool();
            } else if (type === 'char') {
                throw new Error('Not implemented');
            } else if (type === 'String') {
                return <ValueOf<T>>this.readString();
            } else if (type === 'Bytes') {
                return <ValueOf<T>>this.readBytes();
            } else if (type === '()') {
                return <ValueOf<T>>{};
            } else {
                throw Error(`unknown type ${type}`)
            }
        } else if (RustType.isSum(type)) {
            const kind = this.readRustType(type.repr) as number;
            const value = <ValueOf<T>>this.readRustType(type[kind]);
            return <ValueOf<T>>{
                kind,
                value
            };
        } else if (RustType.isSeq(type)) {
            const len = this.readRustType(type.lengthType) as number;
            const arr = Array(len);
            for (let index = 0; index < len; index += 1) {
                arr[index] = this.readRustType(type.type)
            }
            return <ValueOf<T>>arr
        } else if (RustType.isString(type)) {
            return <ValueOf<T>>this.readString();
        } else if (RustType.isTuple(type)) {
            return <ValueOf<T>>type.map(t => this.readRustType(t));
        } else if (RustType.isStruct(type)) {
            let obj = {} as Record<string, unknown>;
            for (const key in type) {
                obj[key] = this.readRustType(type[key])
            }
            return <ValueOf<T>>obj
        } else {
            throw Error(`unknown type ${type}`)

        }
        throw new Error(`unresolved type ${type}`);
    }

}


