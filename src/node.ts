import { Endpoint } from "./endpoint";
import { EdgeErrorClass, WaitAckErrorClass } from "./error";
import { ReceivedMessage } from "./message";
import { EdgeError, EdgeMessage, EdgePayload, EdgeRequest, EdgeResponseEnum, EdgeResult, EndpointAddr, Interest, Message, TopicCode } from "./types";

export class Node {
    socket: WebSocket;
    requestId = 0;
    responseWaitingPool = new Map<number, {
        resolve(result: EdgeResult<EdgeResponseEnum, EdgeError>): void;
        reject(error: any): void;
    }>();
    openingWaitingPool = new Set<{
        resolve(): void;
        reject(error: any): void;
    }>();
    alive = false;
    receivedMessageBuffer: Message[] = [];
    endpoints = new Map<EndpointAddr, Endpoint>;
    static connect(options: {
        url: string | URL;
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
                        {
                            const content = payload.content;
                            switch (content.kind) {
                                case "Message":
                                    {
                                        const { message, endpoints } = content.content;
                                        for (const ep of endpoints) {
                                            const endpoint = node.endpoints.get(ep);

                                            let decodedMessage = <ReceivedMessage>{
                                                header: message.header,
                                                payload: new Uint8Array(Buffer.from(atob(message.payload)))
                                            }
                                            if (endpoint !== undefined) {
                                                endpoint.receive(decodedMessage);
                                            }
                                        }

                                    }
                                    break;
                            }
                        }
                    case "Request":
                    case "Error":
                }
            }
        }
        socket.onopen = (_evt) => {
            node.alive = true;
            console.log("socket opened");
            node.openingWaitingPool.forEach((channel) => {
                channel.resolve();
            })
        }
        socket.onclose = (_evt) => {
            node.alive = false;
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
    private waitSocketOpen() {
        return new Promise<void>((resolve, reject) => {
            if (this.alive) {
                resolve();
            } else {
                this.openingWaitingPool.add({
                    resolve,
                    reject
                })
            }
        })
    }
    public async createEndpoint(topic: TopicCode, interests: Interest[]): Promise<Endpoint> {
        await this.waitSocketOpen();
        const requestId = this.nextRequestId();
        const request = <EdgeRequest>{
            seq_id: requestId,
            request: {
                kind: "EndpointOnline",
                content: {
                    topic_code: topic,
                    interests,
                }
            }
        };
        const waitResponse = this.waitResponse(requestId);
        this.sendPayload(<EdgePayload>{
            "kind": "Request",
            "content": request
        })
        const response = await waitResponse;
        if (response.kind !== "Ok") {
            throw new EdgeErrorClass(response.content);
        }
        if (response.content.kind !== "EndpointOnline") {
            throw new Error(`Unexpected response kind ${response.content.kind}`);
        }
        const addr = response.content.content;
        const endpoint = new Endpoint(this, {
            topic,
            address: addr,
            interest: new Set(interests)
        });
        this.endpoints.set(addr, endpoint);
        return endpoint
    }
    public async sendMessage(message: EdgeMessage): Promise<void> {
        await this.waitSocketOpen();
        let requestId = this.nextRequestId();
        let request = <EdgeRequest>{
            seq_id: requestId,
            request: {
                kind: "SendMessage",
                content: message
            }
        };
        let waitResponse = this.waitResponse(requestId);
        this.sendPayload(<EdgePayload>{
            "kind": "Request",
            "content": request
        })
        let response = await waitResponse;
        if (response.kind !== "Ok") {
            throw new EdgeErrorClass(response.content);
        }
        if (response.content.kind !== "SendMessage") {
            throw new Error(`Unexpected response kind ${response.content.kind}`);
        }
        let ackResult = response.content.content;
        if (ackResult.kind !== "Ok") {
            console.error(ackResult);
            throw new WaitAckErrorClass(ackResult.content)
        }
    }
}
