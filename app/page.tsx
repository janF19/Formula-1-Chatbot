"use client"

import Image from "next/image"
import f1GPTLogo from "./assets/f1.png"
import { useState, useEffect, useRef } from 'react'
import Bubble from "./components/Bubble"
import LoadingBubble from "./components/LoadingBubble"
import PromptSuggestionsRow from "./components/PromptSuggestionsRow"

type Message = {
    id: string;
    content: string;
    role: 'user' | 'assistant';
}

const Home = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Add user message
        const userMessage = {
            id: crypto.randomUUID(),
            content: input.trim(),
            role: 'user' as const
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] })
            });

            if (!response.ok) throw new Error('Failed to get response');

            const assistantMessage = await response.json();
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Add auto-scroll effect
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]); // Scroll when messages change

    return (
        <main>
            <Image src={f1GPTLogo} alt="F1 GPT Logo" width={100} height={100} />
            <section 
                className={`chat-container ${messages.length === 0 ? "" : "populated"}`}
            >
                {messages.length === 0 ? (
                    <>
                        <p className="starter-text">
                            The ultimate place for Formula One super fans!
                            Ask FGPT anything about the fantastic topics of F1 racing
                            and it will come back with the most up-to-date answers.
                            We hope you enjoy it!
                        </p>
                        <br />
                        <PromptSuggestionsRow onPromptClick={setInput}/>
                    </>
                ) : (
                    <>
                        {messages.map(message => (
                            <Bubble key={message.id} message={message} />
                        ))}
                        {isLoading && <LoadingBubble />}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </section>

            <form onSubmit={handleSubmit}>
                <input
                    className="question-box"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything about F1!"
                    disabled={isLoading}
                />
                <input
                    type="submit"
                    value="Send"
                    disabled={isLoading || !input.trim()}
                />
            </form>
        </main>
    );
};

export default Home;