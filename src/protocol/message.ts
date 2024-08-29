import { array, enumKind, enumUnion, none, option, some, struct, ValueOf, vec } from "../codec"
import { TopicCode } from "./topic"

export enum MessageAckExpectKind {
    Sent = 0x00,
    Received = 0x01,
    Processed = 0x02,
}

export enum MessageStatusKind {
    Sending = 0xfe,
    Unsent = 0xff,
    Sent = 0x00,
    Received = 0x01,
    Processed = 0x02,
    Failed = 0x80,
    Unreachable = 0x81,
}

export enum MessageTargetKind {
    Durable = 0,
    Online = 1,
    Available = 2,
    Push = 3,
}
const TYPE_UTC = struct({
    seconds: 'u64',
    nanos: 'u32',
})
export type Utc = ValueOf<typeof TYPE_UTC>

const TYPE_MESSAGE_DURABILITY_CONFIG = struct({
    expire: TYPE_UTC,
    maxReceiver: option('u32'),
})
export type MessageDurabilityConfig = ValueOf<typeof TYPE_MESSAGE_DURABILITY_CONFIG>

export const TYPE_SUBJECT = 'String';
export const TYPE_INTEREST = 'String';
export type Subject = ValueOf<typeof TYPE_SUBJECT>
export type Interest = ValueOf<typeof TYPE_INTEREST>

export const TYPE_EDGE_MESSAGE_HEADER = struct({
    ackKind: enumUnion('u8', MessageAckExpectKind),
    targetKind: enumUnion('u8', MessageTargetKind),
    durability: option(TYPE_MESSAGE_DURABILITY_CONFIG),
    subjects: vec(TYPE_SUBJECT),
})
export type EdgeMessageHeader = ValueOf<typeof TYPE_EDGE_MESSAGE_HEADER>

export const TYPE_EDGE_MESSAGE = struct({
    header: TYPE_EDGE_MESSAGE_HEADER,
    payload: 'Bytes',
})

export type EdgeMessage = ValueOf<typeof TYPE_EDGE_MESSAGE>


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
    subjects: Subject[],
    /**
     * The topic of the message
     */
    topic: TopicCode,
}


export function message<T>(body: T, config: MessageConfig): EdgeMessage {
    // convert the config to the header
    function fromConfig(config: MessageConfig): EdgeMessageHeader {
        const durability = config.durability ? some({
            expire: {
                seconds: BigInt(config.durability.expire.getTime() / 1000),
                nanos: 0
            },
            maxReceiver: config.durability.maxReceiver ? some(config.durability.maxReceiver) : none()
        }) : none();
        if (config.subjects.length === 0) {
            throw new Error("At least one subject is required")
        }
        return {
            ackKind: enumKind(config.ackKind ?? MessageAckExpectKind.Sent),
            targetKind: enumKind(config.targetKind ?? MessageTargetKind.Push),
            durability,
            subjects: config.subjects
        }
    }

    const header = fromConfig(config);
    const json = JSON.stringify(body);
    const payload = new TextEncoder().encode(json);
    return {
        header,
        payload
    }
}

export const TYPE_U8x16 = array('u8', 16)
export type MessageId = ValueOf<typeof TYPE_U8x16>