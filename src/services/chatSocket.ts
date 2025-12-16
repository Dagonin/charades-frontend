let socket: WebSocket | null = null;

export type ChatMessage = {
    gameId?: number | null;
    roundId?: number | null;
    sender: string;
    content: string;
    systemMessage?: boolean;
};

export function connectChat(onMessage: (msg: ChatMessage) => void) {
    socket = new WebSocket("ws://localhost:9090/ws");

    socket.onopen = () => {
        console.log("WS connected");
    };

    socket.onmessage = (event) => {
        try {
            const msg: ChatMessage = JSON.parse(event.data);
            onMessage(msg);
        } catch (e) {
            console.error("WS parse error", e);
        }
    };

    socket.onclose = () => {
        console.log("WS disconnected");
    };
}

export function sendGlobalMessage(sender: string, content: string) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(
        JSON.stringify({
            gameId: null,
            sender,
            content,
        })
    );
}
