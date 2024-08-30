import { Encoder, enumUnion, struct, ValueOf } from "../codec";
import { TYPE_EDGE_MESSAGE } from "./message";
export enum EdgeRequestKind {
    SendMessage = 0x10,
    CreateEndpoint = 0x11,
    DeleteEndpoint = 0x12,
    Ack = 0x13,
}

export const TYPE_EDGE_REQUEST = struct({
    id: 'u64',
    kind: enumUnion('u8', EdgeRequestKind),
    payload: 'Bytes',
})

export type TypeEdgeRequest = typeof TYPE_EDGE_MESSAGE


type RequestType<K extends EdgeRequestKind> = K extends EdgeRequestKind.SendMessage ? typeof TYPE_EDGE_MESSAGE : never

export function edgeRequest<K extends EdgeRequestKind>(id: number, kind: K, request: ValueOf<RequestType<K>>): ValueOf<typeof TYPE_EDGE_REQUEST> {
    let encoder = new Encoder();
    encoder.writeRustType(TYPE_EDGE_MESSAGE, request);
    let payload = new Uint8Array(encoder.bytes());
    return {
        id: BigInt(id),
        kind: {
            kind: kind,
            value: {}
        },
        payload
    }
}