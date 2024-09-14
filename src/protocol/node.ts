import { EdgeErrorClass, WaitAckErrorClass } from "./error";
import { EdgeError, EdgeMessage, EdgePayload, EdgeRequest, EdgeResponseEnum, EdgeResult } from "./types";

export class Node {
    socket: WebSocket;
    requestId = 0;
    responseWaitingPool = new Map<number, {
        resolve(result: EdgeResult<EdgeResponseEnum, EdgeError>): void;
        reject(error: any): void;
    }>();
    static connect(options: {
        url: URL;
    }): Node {
        const socket = new WebSocket(options.url);
        socket.binaryType = "arraybuffer";
        const node = new Node(socket);
        socket.onmessage = (evt) => {
            if (evt.data instanceof ArrayBuffer) {
                let text = new TextDecoder().decode(evt.data);
                let payload: EdgePayload = JSON.parse(text);

                switch (payload.kind) {
                    case "Response":
                        {
                            const result = payload.content.result;
                            const seqId = payload.content.seq_id;
                            const channel = node.responseWaitingPool.get(seqId);
                            channel?.resolve(result);
                        }
                        break;
                    case "Push":
                    case "Request":
                    case "Error":
                }
            }
        }
        return node;
    }
    constructor(socket: WebSocket) {
        this.socket = socket;
    }

    private sendPayload(payload: EdgePayload) {
        let text = JSON.stringify(payload);
        let binary = new TextEncoder().encode(text);
        this.socket.send(binary);
    }
    private nextRequestId() {
        return ++this.requestId;
    }
    private waitResponse(requestId: number): Promise<EdgeResult<EdgeResponseEnum, EdgeError>> {
        return new Promise<EdgeResult<EdgeResponseEnum, EdgeError>>((respResolve, respReject) => {
            this.responseWaitingPool.set(requestId, {
                resolve: respResolve,
                reject: respReject
            })
        })
    }
    public async sendMessage(message: EdgeMessage): Promise<void> {
        let requestId = this.nextRequestId();
        let request = <EdgeRequest> {
            seq_id: requestId,
            request: {
                kind: "SendMessage",
                content: message
            }
        };
        let waitResponse = this.waitResponse(requestId);
        this.sendPayload(<EdgePayload> {
            "kind": "Request",
            "content": request
        })
        let response = await waitResponse;
        if (response.kind !== "Ok") {
            throw new EdgeErrorClass(response.content);
        }
        let ackResult = response.content.content;

        if (ackResult.kind !== "Ok") {
            throw new WaitAckErrorClass(ackResult.content)
        }
    }
}
