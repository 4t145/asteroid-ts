import { enumUnion, struct, tuple, ValueOf } from "../codec"

export enum N2NPayloadKind {
    Auth = 0x00,
    Heartbeat = 0x02,
    EdgeRequest = 0x30,
    EdgeResponse = 0x31,
    EdgeMessage = 0x32,
}

export enum NodeKind {
    Cluster = 0x00,
    Edge = 0x01,
}

export const TYPE_N2N_PACKET_HEADER = struct({
    id: tuple('u32', 'u32', 'u32', 'u32'),
    kind: enumUnion('u8', N2NPayloadKind),
    payload_size: 'u32',
}) 
export type N2nPacketHeader = ValueOf<typeof TYPE_N2N_PACKET_HEADER>

export const TYPE_NODE_INFO = struct({
    id: tuple('u32', 'u32', 'u32', 'u32'),
    kind: enumUnion('u8', NodeKind),
})
export type NodeInfo = ValueOf<typeof TYPE_NODE_INFO>

export const TYPE_N2N_AUTH = struct({
    info: TYPE_NODE_INFO,
    auth: struct({})
})
export type N2nAuth = ValueOf<typeof TYPE_N2N_AUTH>

export const TYPE_N2N_PACKET = struct({
    header: TYPE_N2N_PACKET_HEADER,
    payload: 'Bytes'
})
export type N2nPacket = ValueOf<typeof TYPE_N2N_PACKET>

