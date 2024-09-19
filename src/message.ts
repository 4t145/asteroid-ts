import { EdgeMessage, EdgeMessageHeader, MessageAckExpectKind, MessageHeader, MessageTargetKind, Subject, TopicCode } from "./types";



export type MessageConfig = {
    /**
     * The kind of ack expected, default to `MessageAckExpectKind.Sent`
     */
    ackKind?: MessageAckExpectKind,
    /** 
     * The target kind of the message, default to `MessageTargetKind.Push`
     */
    targetKind?: MessageTargetKind,
    /**
     * The durability configuration of the message, default to `undefined`
     */
    durability?: {
        expire: Date,
        maxReceiver?: number,
    },
    /**
     * The subjects of the message, at least one subject is required
     */
    subjects: Exclude<Subject[], []>,
    /**
     * The topic of the message
     */
    topic: TopicCode,
}

export interface ReceivedMessage {
    header: MessageHeader;
    payload: Uint8Array;
}
export function newMessage<T>(body: T, config: MessageConfig): EdgeMessage {
    // convert the config to the header
    function fromConfig(config: MessageConfig): EdgeMessageHeader {
        const ack_kind = config.ackKind ?? MessageAckExpectKind.Sent;
        const target_kind = config.targetKind ?? MessageTargetKind.Push;
        const durability = config.durability;
        return {
            ack_kind,
            target_kind,
            durability,
            subjects: config.subjects,
            topic: config.topic
        }
    }

    const header = fromConfig(config);
    const json = JSON.stringify(body);
    const payload = new TextEncoder().encode(json);
    const base64Json = Buffer.from(payload).toString('base64');
    return {
        header,
        payload: base64Json
    }
}