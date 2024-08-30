import { Decoder, enumKind, Ok, result, RustResult, RustType, ValueOf } from "../codec";
import { ConnectionOptions, newNodeId, newPacket, readPacket } from "./connection";
import { EdgeError, EdgeErrorClass, TYPE_EDGE_ERROR, TypeEdgeError } from "./edgeResult";
import { EdgeMessage, MessageException, MessageId, TYPE_EDGE_MESSAGE, TYPE_U8x16, TYPE_WAIT_ERROR, TYPE_WAIT_SUCCESS } from "./message";
import { N2nAuth, N2NPayloadKind, NodeInfo, NodeKind, TYPE_N2N_AUTH } from "./n2nPacket";
import { EdgeRequestKind, TYPE_EDGE_REQUEST, edgeRequest } from "./request";
import { TYPE_RESPONSE } from "./response";

export class Node {
    socket: WebSocket;
    peerAuth?: N2nAuth;
    requestId = 0;
    responseWaitingPool = new Map<number, {
        resolve(result: ValueOf<RustResult<'Bytes', typeof TYPE_EDGE_ERROR>>): void;
        reject(error: any): void;
    }>();
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
                            const response = decoder.readRustType(TYPE_RESPONSE);
                            const requestId = Number(response.id);
                            const channel = node.responseWaitingPool.get(requestId);
                            channel?.resolve(response.result);
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
    private waitResponse(requestId: number): Promise<ValueOf<RustResult<'Bytes', TypeEdgeError>>> {
        return new Promise<ValueOf<RustResult<'Bytes', TypeEdgeError>>>((respResolve, respReject) => {
            this.responseWaitingPool.set(requestId, {
                resolve: respResolve,
                reject: respReject
            })
        })
    }
    public async sendMessage(message: EdgeMessage): Promise<void> {
        let requestId = this.nextRequestId();
        let value = edgeRequest(requestId, EdgeRequestKind.SendMessage, message);
        let waitResponse = this.waitResponse(requestId);
        this.sendPacket(N2NPayloadKind.EdgeRequest, TYPE_EDGE_REQUEST, value);
        let response = await waitResponse;
        if (response.kind !== Ok) {
            throw new EdgeErrorClass(response.value);
        } 
        let ackResult = new Decoder(response.value).readRustType(result(TYPE_WAIT_SUCCESS, TYPE_WAIT_ERROR));
        if (ackResult.kind !== Ok) {
            throw new MessageException(ackResult.value)
        }
    }
}
