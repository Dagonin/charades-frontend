import { useEffect, useState } from "react";
import { connectChat, sendGlobalMessage } from "../services/chatSocket";
import type { ChatMessage } from "../services/chatSocket";

export default function GlobalChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");
    const [nick, setNick] = useState("Player");

    useEffect(() => {
        connectChat((msg) => {
            setMessages((prev) => [...prev, msg]);
        });
    }, []);

    const send = () => {
        if (!text.trim()) return;
        sendGlobalMessage(nick, text);
        setText("");
    };

    return (
        <div style={{ border: "1px solid #ccc", padding: 10, width: 300 }}>
    <h3>Global Chat</h3>

    <div style={{ height: 200, overflowY: "auto", marginBottom: 10 }}>
    {messages.map((m, i) => (
        <div key={i}>
            {m.systemMessage ? (
                    <em>{m.content}</em>
                ) : (
                    <strong>{m.sender}: </strong>
    )}
        {!m.systemMessage && m.content}
        </div>
    ))}
    </div>

    <input
    placeholder="nick"
    value={nick}
    onChange={(e) => setNick(e.target.value)}
    />

    <input
    placeholder="message"
    value={text}
    onChange={(e) => setText(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && send()}
    />

    <button onClick={send}>Send</button>
        </div>
);
}
