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
        const client = new DataAPIClient(ASTRADB_DB_APPLICATION_TOKEN);
        const db = client.db(ASTRADB_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });
        
        const { messages } = await req.json();
        const latestMessage = messages[messages?.length - 1]?.content;
        let docContext = "";

        // Get embeddings and perform vector search
        try {
            const embedResponse = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "mxbai-embed-large",
                    prompt: latestMessage
                })
            });

            if (!embedResponse.ok) {
                throw new Error(`Embedding API error: ${embedResponse.status}`);
            }

            const embedding = await embedResponse.json();
            
            const collection = await db.collection(ASTRA_DB_COLLECTION);
            const cursor = collection.find(null, {
                sort: { $vector: embedding.embedding },
                limit: 10
            });
            
            const documents = await cursor.toArray();
            docContext = documents?.map(doc => doc.text).join("\n");

        } catch (err) {
            console.error("Vector Search Error:", err);
        }

        const systemPrompt = {
            role: "system",
            content: `You are an AI assistant who knows everything about Formula One. Use the below context to augment what you know about Formula One racing. 
            --------------
            START CONTEXT
            ${docContext}
            END CONTEXT
            
            QUESTION: ${latestMessage}`
        };

        // Get Llama response
        const llamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "llama2",
                messages: [systemPrompt, ...messages],
                stream: false  // Changed to false to get complete response
            })
        });

        if (!llamaResponse.ok) {
            throw new Error(`Llama API error: ${llamaResponse.status}`);
        }

        const responseData = await llamaResponse.json();
        
        // Return complete response
        return new Response(
            JSON.stringify({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: responseData.message.content
            }), 
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error("Fatal Error:", error);
        return new Response(JSON.stringify({ 
            error: 'Chat failed',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}