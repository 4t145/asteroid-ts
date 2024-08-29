import { Decoder, enumKind, RustType, ValueOf } from "../codec";
import { ConnectionOptions, newNodeId, newPacket, readPacket } from "./connection";
import { EdgeMessage, MessageId, TYPE_EDGE_MESSAGE } from "./message";
import { N2nAuth, N2NPayloadKind, NodeInfo, NodeKind, TYPE_N2N_AUTH } from "./n2nPacket";
import { EdgeRequestKind, TYPE_EDGE_REQUEST, edgeRequest } from "./request";

export class Node {
    socket: WebSocket;
    peerAuth?: N2nAuth;
    requestId = 0;
    pool = new Map<number, (value: any) => void>();
    static connect(options: ConnectionOptions): Node {
        const socket = new WebSocket(options.url);
        socket.binaryType = "arraybuffer";
        const nodeInfo = <NodeInfo>{
            id: newNodeId(),
            kind: enumKind(NodeKind.Edge)
        }
        const auth = <N2nAuth>{
            info: nodeInfo,
            auth: {}
        }
        const node = new Node(socket);
        socket.onopen = (_evt) => {
            socket.send(newPacket(N2NPayloadKind.Auth, TYPE_N2N_AUTH, auth));
        }
        socket.onmessage = (evt) => {
            if (evt.data instanceof ArrayBuffer) {
                const { header, payload } = readPacket(evt.data);
                const kind = header.kind.kind;
                switch (kind) {
                    case N2NPayloadKind.Auth:
                        {
                            const decoder = new Decoder(payload);
                            const authValue = decoder.readRustType(TYPE_N2N_AUTH);
                            node.peerAuth = authValue;
                        }
                        break;
                    case N2NPayloadKind.Heartbeat:
                        break;
                    case N2NPayloadKind.EdgeRequest:
                        break;
                    case N2NPayloadKind.EdgeResponse:
                        {
                            const decoder = new Decoder(payload);
                            
                        }
                        break;
                    case N2NPayloadKind.EdgeMessage:
                        break;
                }
            }
        }
        return node;
    }
    constructor(socket: WebSocket) {
        this.socket = socket;
    }

    private sendPacket<T extends RustType>(kind: N2NPayloadKind, payload: T, value: ValueOf<T>) {
        this.socket.send(newPacket(kind, payload, value));
    }
    private nextRequestId() {
        return ++this.requestId;
    }
    public sendMessage(message: EdgeMessage): Promise<MessageId> {
        let requestId = this.nextRequestId();
        let value = edgeRequest(requestId, EdgeRequestKind.SendMessage, message);
        this.sendPacket(N2NPayloadKind.EdgeRequest, TYPE_EDGE_REQUEST, value);
        return new Promise<MessageId>((resolve, reject) => {
            this.pool.set(requestId, (value) => {

            })
        })
    }
}
