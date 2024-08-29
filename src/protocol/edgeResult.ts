import { enumKind, enumUnion, option, result, RustResult, RustType, struct, ValueOf } from "../codec";
export enum EdgeErrorKind {
    Decode = 0x00,
    Internal = 0x01,
}

export const TYPE_EDGE_ERROR = struct({
    context: 'String',
    message: option('String'),
    kind: enumUnion('u8', EdgeErrorKind),
})
export type EdgeError = ValueOf<typeof TYPE_EDGE_ERROR>;
    

export const edgeResult = <T extends RustType>(type: T): RustResult<T, typeof TYPE_EDGE_ERROR> => result<T, typeof TYPE_EDGE_ERROR>(type, TYPE_EDGE_ERROR)


