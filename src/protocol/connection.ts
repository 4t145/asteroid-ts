import { read } from "bun:ffi";
import { Decoder, Encoder, enumKind, RustType, ValueOf } from "../codec";
import { N2nAuth, N2nPacket, N2nPacketHeader, N2NPayloadKind, NodeInfo, NodeKind, TYPE_N2N_AUTH, TYPE_N2N_PACKET } from "./n2nPacket";

export type ConnectionOptions = {
    url: string | URL,
    bufferSize?: number,
}

function packetId(): [number, number, number, number] {
    return [0, 0, 0, 0]
}
class InstanceCounter {
    static counter = 0;
    static next() {
        return ++InstanceCounter.counter;
    }
}
export function newNodeId(): [number, number, number, number] {
    const array = new Uint8Array(16);
    const machineId = new Uint8Array(8);
    crypto.getRandomValues(machineId);
    const KIND_SNOWFLAKE = 0x00;
    array.set([KIND_SNOWFLAKE], 0);
    array.set(machineId, 1);
    array.set([InstanceCounter.next()], 9);
    const timestamp = new Uint8Array(6);
    const now = Date.now();
    const timestampView = new DataView(timestamp.buffer);
    timestampView.setUint32(2, now);
    array.set(timestamp, 10);
    let view = new DataView(array.buffer);
    return [
        view.getUint32(0),
        view.getUint32(4),
        view.getUint32(8),
        view.getUint32(12),
    ]
}

export function newPacket<T extends RustType>(kind: N2NPayloadKind, payloadType: T, value: ValueOf<T>): ArrayBuffer {
    const encoder = new Encoder(512);
    encoder.writeRustType(payloadType, value);
    const bytes = encoder.bytes();
    const payloadSize = bytes.byteLength;
    const header = <N2nPacketHeader>{
        id: packetId(),
        kind: enumKind(kind),
        payload_size: payloadSize
    };
    const buffer = new ArrayBuffer(21 + payloadSize);
    const headerView = new DataView(buffer, 0, 21);
    headerView.setUint32(0, header.id[0]);
    headerView.setUint32(4, header.id[1]);
    headerView.setUint32(8, header.id[2]);
    headerView.setUint32(12, header.id[3]);
    headerView.setUint8(16, header.kind.kind);
    headerView.setUint32(17, header.payload_size);
    const payloadView = new Uint8Array(buffer, 21);
    payloadView.set(new Uint8Array(bytes), 0);
    return buffer;
}

export function readPacket(buffer: ArrayBuffer): N2nPacket {
    const view = new DataView(buffer);
    const id = [
        view.getUint32(0),
        view.getUint32(4),
        view.getUint32(8),
        view.getUint32(12),
    ] as [number, number, number, number];
    const kind = view.getUint8(16);
    const payloadSize = view.getUint32(17);
    const header = <N2nPacketHeader>{
        id,
        kind: enumKind(kind),
        payload_size: payloadSize
    }
    const payload = new Uint8Array(buffer, 21);
    return {
        header,
        payload
    }
}


