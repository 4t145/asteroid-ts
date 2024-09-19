import { MessageTargetKind, Node, newMessage } from "../src";

const message = newMessage(
    {
        "hello": "world"
    }, {
    topic: "test",
    subjects: ["event/hello"],
    targetKind: MessageTargetKind.Online
});

const nodeIdA = await (await fetch("http://localhost:8080/node_id", {
    "method": "PUT"
})).text();
const nodeIdB = await (await fetch("http://localhost:8080/node_id", {
    "method": "PUT"
})).text();
const nodeA = Node.connect({
    url: `ws://localhost:8080/connect?node_id=${nodeIdA}`
})
const nodeB = Node.connect({
    url: `ws://localhost:8080/connect?node_id=${nodeIdB}`
})
const endpoint = await nodeB.createEndpoint("test", ["event/*"]);
console.log(endpoint.address);
await nodeA.sendMessage(message);
const messages = endpoint.messages();
for await (const message of messages) {
    if (message !== undefined) {
        console.log(message,);
        const header = message.header;
        const decoded = new TextDecoder().decode(message.payload);
        const payload = JSON.parse(decoded);
        console.log(payload);
    }
}
