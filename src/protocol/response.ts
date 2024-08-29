import { result, struct, ValueOf } from "../codec";
import { TYPE_EDGE_ERROR } from "./edgeResult";

export const TYPE_RESPONSE = struct({
    id: 'u64',
    result: result('Bytes', TYPE_EDGE_ERROR)
})

export type Response = {
    id: bigint,
    result: ValueOf<typeof TYPE_EDGE_ERROR>
}