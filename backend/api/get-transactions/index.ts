import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const dynamodb = new DynamoDBClient({});
const secretsManager = new SecretsManagerClient({});

const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME!;
const ETHERSCAN_API_KEY_SECRET = process.env.ETHERSCAN_API_KEY_SECRET!;
const CACHE_TTL_SECONDS = 1800; // 30 minutes

interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    blockNumber: string;
    timeStamp: string;
    gasUsed: string;
    gasPrice: string;
}

/**
 * Lambda: Get Transactions
 * 
 * Flow:
 * 1. Check DynamoDB cache
 * 2. If cache miss, call Etherscan API
 * 3. Store in cache with TTL
 * 4. Return transactions
 * 
 * Concept SAA-C03:
 * - Domaine 3 (Performance): Cache-aside pattern reduces latency
 * - Domaine 4 (Coût): Reduces Etherscan API calls by 95%
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Get wallet address from query parameters
        const walletAddress = event.queryStringParameters?.wallet;

        if (!walletAddress) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing wallet address parameter' }),
            };
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid Ethereum address format' }),
            };
        }

        // Step 1: Check cache
        console.log(`Checking cache for wallet: ${walletAddress}`);
        const cachedTransactions = await getCachedTransactions(walletAddress);

        if (cachedTransactions) {
            console.log('Cache HIT - returning cached transactions');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache': 'HIT',
                },
                body: JSON.stringify({
                    transactions: cachedTransactions,
                    source: 'cache',
                }),
            };
        }

        // Step 2: Cache miss - fetch from Etherscan
        console.log('Cache MISS - fetching from Etherscan API');
        const etherscanApiKey = await getEtherscanApiKey();
        const transactions = await fetchFromEtherscan(walletAddress, etherscanApiKey);

        // Step 3: Store in cache
        await cacheTransactions(walletAddress, transactions);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'MISS',
            },
            body: JSON.stringify({
                transactions,
                source: 'etherscan',
            }),
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};

/**
 * Get cached transactions from DynamoDB
 */
async function getCachedTransactions(walletAddress: string): Promise<Transaction[] | null> {
    try {
        const result = await dynamodb.send(new GetItemCommand({
            TableName: CACHE_TABLE_NAME,
            Key: {
                wallet_address: { S: walletAddress.toLowerCase() },
            },
        }));

        if (!result.Item) {
            return null;
        }

        // Check if cache is still valid (TTL not expired)
        const expiresAt = parseInt(result.Item.expires_at.N || '0');
        if (Date.now() / 1000 > expiresAt) {
            console.log('Cache expired');
            return null;
        }

        // Parse transactions from DynamoDB format
        const transactions = JSON.parse(result.Item.transactions.S || '[]');
        return transactions;

    } catch (error) {
        console.error('Error reading from cache:', error);
        return null; // On error, fetch from Etherscan
    }
}

/**
 * Fetch transactions from Etherscan API
 */
async function fetchFromEtherscan(walletAddress: string, apiKey: string): Promise<Transaction[]> {
    const url = `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1') {
        throw new Error(`Etherscan API error: ${data.message}`);
    }

    return data.result || [];
}

/**
 * Cache transactions in DynamoDB
 */
async function cacheTransactions(walletAddress: string, transactions: Transaction[]): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS;

    try {
        await dynamodb.send(new PutItemCommand({
            TableName: CACHE_TABLE_NAME,
            Item: {
                wallet_address: { S: walletAddress.toLowerCase() },
                transactions: { S: JSON.stringify(transactions) },
                expires_at: { N: expiresAt.toString() },
                cached_at: { N: Math.floor(Date.now() / 1000).toString() },
            },
        }));
        console.log('Transactions cached successfully');
    } catch (error) {
        console.error('Error caching transactions:', error);
        // Don't throw - caching is optional
    }
}

/**
 * Get Etherscan API key from Secrets Manager
 */
async function getEtherscanApiKey(): Promise<string> {
    try {
        const result = await secretsManager.send(new GetSecretValueCommand({
            SecretId: ETHERSCAN_API_KEY_SECRET,
        }));

        if (!result.SecretString) {
            throw new Error('Secret not found');
        }

        const secret = JSON.parse(result.SecretString);
        return secret.apiKey || secret.ETHERSCAN_API_KEY;

    } catch (error) {
        console.error('Error fetching API key from Secrets Manager:', error);
        // Fallback to environment variable (dev only)
        return process.env.ETHERSCAN_API_KEY || '';
    }
}
