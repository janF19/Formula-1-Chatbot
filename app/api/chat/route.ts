import { DataAPIClient } from "@datastax/astra-db-ts";

const {
    ASTRA_DB_NAMESPACE,
    ASTRADB_DB_API_ENDPOINT,
    ASTRADB_DB_APPLICATION_TOKEN,
    ASTRA_DB_COLLECTION,
} = process.env;

const OLLAMA_BASE_URL = 'http://localhost:11434';

export async function POST(req: Request) {
    try {
        console.log("=== Starting Chat Request ===");
        
        // Initialize DB
        console.log("Initializing DB connection...");
        const client = new DataAPIClient(ASTRADB_DB_APPLICATION_TOKEN);
        const db = client.db(ASTRADB_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });
        console.log("DB connection initialized successfully");

        const { messages } = await req.json();
        const latestMessage = messages[messages?.length - 1]?.content;
        console.log("Latest message:", latestMessage);
        let docContext = "";

        // Get embeddings for vector search
        try {
            console.log("Requesting embeddings for:", latestMessage);
            const embedResponse = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "mxbai-embed-large",
                    prompt: latestMessage
                })
            });

            console.log("Embedding response status:", embedResponse.status);
            
            if (!embedResponse.ok) {
                throw new Error(`Embedding API error: ${embedResponse.status}`);
            }

            const embedding = await embedResponse.json();
            console.log("Got embedding response:", {
                hasEmbedding: !!embedding?.embedding,
                embeddingLength: embedding?.embedding?.length
            });

            if (!embedding?.embedding) {
                throw new Error("Invalid embedding format received");
            }

            // Test vector search
            console.log("Starting vector search...");
            const collection = await db.collection(ASTRA_DB_COLLECTION);
            
            const cursor = collection.find(null, {
                sort: { $vector: embedding.embedding },
                limit: 10
            });

            console.log("Vector search query executed");
            
            const documents = await cursor.toArray();
            console.log("Found documents:", {
                count: documents.length,
                sampleDoc: documents[0] ? {
                    hasText: !!documents[0].text,
                    textLength: documents[0].text?.length,
                    preview: documents[0].text?.substring(0, 100)
                } : null
            });

            docContext = JSON.stringify(documents?.map(doc => doc.text));
            console.log("Context length:", docContext.length);

        } catch (err) {
            console.error("=== Vector Search Error ===");
            console.error("Error details:", {
                message: err.message,
                stack: err.stack,
                name: err.name
            });
            console.error("========================");
        }

        const systemPrompt = {
            role: "system",
            content: `You are an AI assistant who knows everything about Formula One. Use the below context to augment what you know about Formula One racing. The context will provide you with the most recent page data from wikipedia, the official F1 website and others.
            If the context doesn't include the information you need answer based on your existing knowledge and don't mention the source of your information or
            what the context does or doesn't include.
            Format responses using markdown where applicable and don't return images.
            --------------
            START CONTEXT
            ${docContext}
            END CONTEXT
            
            -------------
            QUESTION: ${latestMessage}
            -------------`
        };

        const completeMessages = [systemPrompt, ...messages];

        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "llama2",
                messages: completeMessages,
                stream: true,
                options: {
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

       
        // Create a readable stream
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) return;

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const text = new TextDecoder().decode(value);
                        const lines = text.split('\n');

                        for (const line of lines) {
                            if (line.trim() === '') continue;

                            try {
                                const json = JSON.parse(line);
                                
                                if (json.done) {
                                    controller.enqueue('data: [DONE]\n\n');
                                    continue;
                                }

                                if (json.message?.content) {
                                    const message = {
                                        id: crypto.randomUUID(),
                                        role: 'assistant',
                                        content: json.message.content
                                    };
                                    controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
                                }
                            } catch (e) {
                                console.warn('Error parsing JSON line:', e);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Stream reading error:', e);
                } finally {
                    controller.close();
                }
            }
        });

        console.log("=== Request Complete ===");
        
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("=== Fatal Error ===");
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return new Response(JSON.stringify({ 
            error: 'Chat failed',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function GET(req: Request) {
    try {
        console.log("=== Testing Vector DB ===");
        const client = new DataAPIClient(ASTRADB_DB_APPLICATION_TOKEN);
        const db = client.db(ASTRADB_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });
        const collection = await db.collection(ASTRA_DB_COLLECTION);
        
        // Try to get a single document with an empty filter
        const doc = await collection.findOne({});
        
        console.log("Test query result:", {
            hasDoc: !!doc,
            docFields: doc ? Object.keys(doc) : null,
            textSample: doc?.text ? doc.text.substring(0, 100) + "..." : null
        });
        
        return new Response(JSON.stringify({
            success: true,
            hasDocument: !!doc,
            documentSample: doc ? {
                hasText: !!doc.text,
                textLength: doc.text?.length,
                firstFewChars: doc.text?.substring(0, 100)
            } : null
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error("Vector DB Test Error:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}