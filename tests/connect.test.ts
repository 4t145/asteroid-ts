import { Node } from '../src/protocol'

const node = Node.connect({
    url: "ws://localhost:8080"
})

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