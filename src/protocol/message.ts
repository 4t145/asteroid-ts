import { EdgeMessage, EdgeMessageHeader, MessageAckExpectKind, MessageTargetKind, Subject, TopicCode } from "./types";



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

export const TYPE_WAIT_SUCCESS = struct(
    {
        status: map(TYPE_U8x16, enumUnion('u8', MessageStatusKind))
    }
)

export const TYPE_WAIT_ERROR = struct(
    {
        status: map(TYPE_U8x16, enumUnion('u8', MessageStatusKind)),
        exception: option(enumUnion('u8', WaitAckErrorException))
    }
)

export class MessageException extends Error {
    status: {
        endpointAddr: ValueOf<typeof TYPE_U8x16>,
        state: MessageStatusKind
    }[]
    exception?: WaitAckErrorException
    constructor(error: ValueOf<typeof TYPE_WAIT_ERROR>) {
        super()
        this.status = error.status.map((e) => ({
            endpointAddr: e[0],
            state: e[1].kind
        }))
        this.exception = error.exception.kind === Some ? error.exception.value.kind : undefined
    }
}