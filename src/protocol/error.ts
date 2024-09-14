import { EdgeError, EdgeErrorKind, EndpointAddr, MessageStatusKind, WaitAckError } from "./types";

export class EdgeErrorClass extends Error {
    context: string;
    kind: EdgeErrorKind;
    constructor(error: EdgeError) {
        super(error.message);
        this.context = error.context;
        this.kind = error.kind;
    }
}

export class WaitAckErrorClass extends Error {
    status: Record<EndpointAddr, MessageStatusKind>;
    constructor(error: WaitAckError) {
        super(error.exception);
        this.status = error.status;
    }
}