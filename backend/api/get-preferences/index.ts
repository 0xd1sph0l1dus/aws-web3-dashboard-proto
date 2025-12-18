import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME!;

interface UserPreferences {
    theme: string;
    notifications: boolean;
    language: string;
    timezone: string;
}

/**
 * Lambda: Get Preferences
 * 
 * Flow:
 * 1. Extract user_id from Cognito token
 * 2. Query DynamoDB users table
 * 3. Return preferences
 * 
 * Concept SAA-C03:
 * - Domaine 3 (Performance): DynamoDB < 10ms latency
 * - Domaine 1 (Sécurité): User can only access their own data
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Extract user_id from Cognito authorizer
        const userId = event.requestContext.authorizer?.claims?.sub;

        if (!userId) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Unauthorized - missing user_id' }),
            };
        }

        // Get user from DynamoDB
        const result = await dynamodb.send(new GetItemCommand({
            TableName: USERS_TABLE_NAME,
            Key: {
                user_id: { S: userId },
            },
        }));

        if (!result.Item) {
            // User not found - return default preferences
            console.log(`User not found: ${userId} - returning defaults`);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    preferences: getDefaultPreferences(),
                    is_default: true,
                }),
            };
        }

        // Parse preferences from DynamoDB
        const preferences: UserPreferences = result.Item.preferences?.S
            ? JSON.parse(result.Item.preferences.S)
            : getDefaultPreferences();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                wallet_address: result.Item.wallet_address?.S || null,
                email: result.Item.email?.S || null,
                preferences,
                created_at: result.Item.created_at?.S || null,
                updated_at: result.Item.updated_at?.S || null,
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
 * Get default preferences
 */
function getDefaultPreferences(): UserPreferences {
    return {
        theme: 'dark',
        notifications: true,
        language: 'en',
        timezone: 'UTC',
    };
}
