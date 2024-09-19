import { EndpointAddr, Interest, Message, TopicCode } from "./types";
import { Node } from './node';
import { ReceivedMessage } from "./message";
export class Endpoint {
    readonly node: Node;
    readonly topic: TopicCode;
    readonly interest: Set<Interest>;
    readonly address: EndpointAddr;
    private messageQueue: ReceivedMessage[] = [];
    private waitingNextMessage?: {
        resolve: (message: ReceivedMessage) => void;
    };
    constructor(node: Node, config: {
        topic: TopicCode;
        interest: Set<Interest>;
        address: EndpointAddr;
    }) {
        this.node = node;
        this.topic = config.topic;
        this.address = config.address;
        this.interest = config.interest;
    }
    public receive(message: ReceivedMessage) {
        if (this.waitingNextMessage !== undefined) {
            this.waitingNextMessage.resolve(message);
        } else {
            this.messageQueue.push(message);
        }
    }
    public async *messages() {
        while (this.node.alive) {
            if (this.messageQueue.length > 0) {
                yield this.messageQueue.shift();
            } else {
                yield await new Promise<ReceivedMessage>((resolve) => {
                    this.waitingNextMessage = {
                        resolve
                    };
                })
            }
        }
    }
}