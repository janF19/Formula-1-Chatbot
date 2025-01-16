This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.






This is an ai formula 1 chatbot. It uses rag ai technigue to improve llm model response for up to date questions. 


What is Retrieval-Augmented Generation (RAG)?
RAG is a technique for improving the accuracy of an LLM by adding relevant content directly to the LLM’s context window. Here’s how RAG works:

Pick an embedding model to generate embeddings from your data, and then store those embeddings in a vector database.

When the user submits a query, use the same model to generate an embedding from the user’s query, and then run a vector search to find data that’s similar to the user’s query.

Pass this data to the LLM so it’s available in the context window.

When the LLM generates a response, it is less likely to hallucinate (generate answers that sound or look correct but are actually incorrect).





I scraped some websites about formula 1 for newest data and stored it as vectors in Astra DB. 


when running without RAG it response  
ollama run llama2 "Who are the confirmed Ferrari Formula 1 drivers for 2024? Give me just their names."

As of my knowledge cutoff in December 2023, the confirmed Ferrari Formula 1 drivers for the 2024 season are:

1. Sebastian Vettel
2. Charles Leclerc




when running with RAG it responsed with 
Based on the context provided, here are the names of the Ferrari drivers in the 2024 Formula One World Championship:

1. Charles Leclerc
2. Carlos Sainz Jr.

These are the two drivers who competed for Ferrari in the 2024 season.



RAG gave correct response since llama2 was trained on old data and dont have access to new information


this shows benefits of RAG in real world applications. 



#Issues

The issie was to make streaming effect like in chatgpt. so eventually I went with simple approach showing just whole response at once. 


for embedding I used mxbai-embed-large model and for vector search I used cosine similarity. 






Workflow


First database script is run to seeed database with vectors. 
The script loads F1-related websites
Scrapes their content
Splits content into chunks
Creates embeddings for each chunk
Stores them in an Astra DB (vector database)


this procss ensures Each chunk gets its own embedding vector and is stored separately in your Astra database, making it possible to retrieve the most relevant chunks for any given query.



Why Chunking?
Large texts (like entire web pages) are too big for:
1. Vector embeddings (they have token limits)
2. Effective similarity search (too much irrelevant content in one vector)
Contextual responses (too broad)


Benefits of Chunking:
Better Search: When someone searches "Who drives for Mercedes?", you can find the specific relevant chunk rather than the entire webpage
Context Preservation: The overlap ensures you don't cut sentences in awkward places
3. More Precise Embeddings: Each embedding represents a focused piece of information
Token Efficiency: Stays within model token limits




when it comes to making embeddings it comes with several tradeoffs. Important step is making chunks since it comes with tradeoffs.
Larger chunks means fewer API calls, Less expensive for embedding generation but there are more token usage per query when actually using the embeddings. More tokens per response - More context but possibly irrelevant 
less toke usage but better for understanding the whole context and more complex topic but less precise search.

Smaller chunks are opposite, it is more expensive for API calls for embedding generation but Fewer tokens per response<br>- More precise, relevant content, but it may loose context. Lastly there are more database entries

Strategies based on priority:

1) Maximum Accuracy (regardless of resources)

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 256,      // Smaller chunks for precise matching
    chunkOverlap: 128    // 50% overlap for maximum context preservation
})

    Pros:
Very precise search results
Better for finding specific facts
Less noise in each chunk
Cons:
Many more vectors to store
More expensive (storage/computation)
More API calls for embeddings

2) Resource Efficient


const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1024,     // Larger chunks
    chunkOverlap: 100    // Minimal overlap
})


Pros:
Fewer vectors to store
Fewer API calls
Less storage cost
Cons:
Less precise matching
More noise in results
Might miss specific details




Balanced Approach (recommended):

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,      // Medium chunks
    chunkOverlap: 100    // ~20% overlap
})

Pros:
Balanced between accuracy and resource usage
Good for most use cases
Cons:
Not the most precise or efficient




Best Practices Based on Content Type:
1. For Technical Documentation:

{
    chunkSize: 256,
    chunkOverlap: 64     // Technical content needs precise chunks
}



For Narrative Content:

{
    chunkSize: 1024,
    chunkOverlap: 200    // Stories need more context
}


3. For FAQ-style Content:

{
    chunkSize: 384,
    chunkOverlap: 50     // Each Q&A can be its own chunk
}



Common Pitfalls to Avoid:
Too Small Chunks:
// Bad practice
{
    chunkSize: 100,      // Too small!
    chunkOverlap: 50
}


Loses too much context
Creates database bloat
May split important related information
Too Large Chunks:


// Bad practice
{
    chunkSize: 2048,     // Too large!
    chunkOverlap: 100
}


- Makes search less precise
May hit token limits
Includes irrelevant information in results
Rule of Thumb:
Start with chunkSize: 512 and chunkOverlap: 100















Next step of this projec twas to design a chat interface and hook it up to the chat api. 

Frontned 

basic chat app. 




backend Api is designed to handle the chat history and the latest message. It uses Ollama models locally. Interesting 
is use of HTTP for local Llama Why HTTP for Local Llama?

Even though Llama is running locally, it's accessed through HTTP because:
Ollama Architecture: Ollama runs as a local server that exposes an HTTP API on port 11434. This design:
Provides a clean interface for applications
Allows multiple applications to use the same Llama instance
Manages model loading and resource allocation
Process Separation:
The LLM runs in a separate process from your Next.js application
HTTP is a standard way to communicate between processes
Ollama handles the heavy lifting of model management



There are also some tradeoof here. When getting embeddings from ollama with:
const collection = await db.collection(ASTRA_DB_COLLECTION);
            const cursor = collection.find(null, {
                sort: { $vector: embedding.embedding },
                limit: 10
            });


Tradeoffs of the Limit Value
Lower Limit (e.g., 5-10)
👍 Pros:
Faster query performance
Less token usage when sending context to LLM
More focused/precise context
Reduces noise in the response
👎 Cons:
Might miss relevant information
Less comprehensive context for complex queries
Could lead to incomplete answers
Higher Limit (e.g., 20-50)


 Pros:
More comprehensive context
Better for complex questions that need broader context
Higher chance of including relevant information
👎 Cons:
Slower query performance
Higher token usage (could hit LLM context limits)
May introduce noise/irrelevant information
Could make responses more confused or diluted


Best Practices:
Start with 5-10 for simple queries
Use 10-20 for complex questions
Consider adding a similarity threshold to ensure quality
Monitor token usage and adjust accordingly
Quality Over Quantity: It's often better to have fewer, highly relevant documents than many loosely related ones. A limit of 10 is generally a good starting point, but you should test with your specific use case and data.



backend workflow 

Complete Flow:
Frontend sends chat messages to /api/chat
Backend:
Gets embeddings for the latest message
Searches vector database for relevant context
Combines context with user messages
Sends to local Llama server
Returns response to frontend
Frontend displays the response






