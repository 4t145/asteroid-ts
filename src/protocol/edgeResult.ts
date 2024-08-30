import { enumKind, enumUnion, option, result, RustResult, RustType, Some, struct, ValueOf } from "../codec";
export enum EdgeErrorKind {
    Decode = 0x00,
    TopicNotFound = 0x02,
    Internal = 0xf0,
}

export const TYPE_EDGE_ERROR = struct({
    context: 'String',
    message: option('String'),
    kind: enumUnion('u8', EdgeErrorKind),
})
export type TypeEdgeError = typeof TYPE_EDGE_ERROR;
export type EdgeError = ValueOf<TypeEdgeError>;


export const edgeResult = <T extends RustType>(type: T): RustResult<T, typeof TYPE_EDGE_ERROR> => result<T, typeof TYPE_EDGE_ERROR>(type, TYPE_EDGE_ERROR)


export class EdgeErrorClass extends Error {
    context: string;

    constructor(public error: EdgeError) {
        super(error.message.kind === Some ? error.message.value : undefined);
        this.context = error.context;
    }
}