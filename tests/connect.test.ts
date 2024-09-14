import { enumUnion } from '../src/codec';
import { Node } from '../src/protocol'
import { newMessage } from '../src/protocol/message';
import { EdgeRequestKind } from '../src/protocol/request';
console.log(enumUnion('u8', EdgeRequestKind))
const message = newMessage(
    "hello", {
    topic: "test",
    subjects: ["*"]
});
const node = Node.connect({
    url: "ws://localhost:8080"
})
await node.sendMessage(message);

await new Promise<void>((resolve, reject) => {
    setTimeout(() => {
        try {
            node.socket.close();
            resolve();
        } catch (e) {
            reject(e);
        }
    }, 5000)
})