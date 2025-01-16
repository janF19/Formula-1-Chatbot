"use client"

import Image from "next/image"
import f1GPTLogo from "./assets/f1.png"
import { useState } from 'react'
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
    const [error, setError] = useState<Error | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            content: input.trim(),
            role: 'user'
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No reader available');
            }

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const message = JSON.parse(data);
                            setMessages(prev => [...prev, message]);
                        } catch (e) {
                            console.warn('Error parsing message:', e);
                        }
                    }
                }
            }
        } catch (e) {
            setError(e as Error);
            console.error('Chat error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrompt = (promptText: string) => {
        setInput(promptText);
    };

    const noMessages = messages.length === 0;

    return (
        <main>
            <Image src={f1GPTLogo} alt="F1 GPT Logo" width={100} height={100} />
            <section className={noMessages ? "" : "populated"}>
                {noMessages ? (
                    <>
                        <p className="starter-text">
                            The ultimate place for Formula One super fans!
                            Ask FGPT anything about the fantastic topics of F1 racing
                            and it will come back with the most up-to-date answers.
                            We hope you enjoy it!
                        </p>
                        <br />
                        <PromptSuggestionsRow onPromptClick={handlePrompt}/>
                    </>
                ) : (
                    <>
                        {messages.map((message, index) => (
                            <Bubble key={`message-${index}`} message={message}/>
                        ))}
                        {isLoading && <LoadingBubble/>}
                    </>
                )}
            </section>

            {error && (
                <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>
                    Error: {error.message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <input
                    className="question-box"
                    onChange={(e) => setInput(e.target.value)}
                    value={input}
                    placeholder="Ask me anything about F1!"
                    disabled={isLoading}
                />
                <input
                    type="submit"
                    disabled={isLoading || !input.trim()}
                />
            </form>
        </main>
    );
};

export default Home;