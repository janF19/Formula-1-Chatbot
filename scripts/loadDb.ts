import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import "dotenv/config"

// Import node-fetch since Ollama requires making HTTP requests
import fetch from "node-fetch"

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

const {
    ASTRA_DB_NAMESPACE,
    ASTRADB_DB_API_ENDPOINT,
    ASTRADB_DB_APPLICATION_TOKEN,
    ASTRA_DB_COLLECTION
} = process.env

const client = new DataAPIClient(ASTRADB_DB_APPLICATION_TOKEN)
const db = client.db(ASTRADB_DB_API_ENDPOINT!, {namespace: ASTRA_DB_NAMESPACE})

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100
})

// Function to get embeddings from Ollama
async function getEmbeddings(text: string): Promise<number[]> {
    const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
            model: 'mxbai-embed-large',
            prompt: text
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    return data.embedding;
}

const f1Data = [
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://en.wikipedia.org/wiki/2023_Formula_One_World_Championship',
    'https://www.formula1.com/',
    // ... rest of your URLs ...
]

const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
        vector: {
            dimension: 1024, 
            metric: similarityMetric
        }
    })
    console.log(res)
}

const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION!)
    
    for await (const url of f1Data) {
        console.log(`Processing ${url}`)
        const content = await scrapePage(url)
        const chunks = await splitter.splitText(content)
        
        for await (const chunk of chunks) {
            try {
                const vector = await getEmbeddings(chunk)
                
                const res = await collection.insertOne({
                    $vector: vector,
                    text: chunk
                })
                console.log(`Inserted chunk with ID: ${res.insertedId}`)
            } catch (error) {
                console.error(`Error processing chunk: ${error}`)
            }
        }
    }
}

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerHTML);
            await browser.close();
            return result;
        }
    });
    
    return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
}

createCollection().then(() => loadSampleData())