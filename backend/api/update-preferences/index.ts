import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME!;

interface UserPreferences {
    theme?: string;
    notifications?: boolean;
    language?: string;
    timezone?: string;
}

/**
 * Lambda: Update Preferences
 * 
 * Flow:
 * 1. Extract user_id from Cognito token
 * 2. Validate input
 * 3. Update preferences in DynamoDB
 * 4. Return updated preferences
 * 
 * Concept SAA-C03:
 * - Domaine 3 (Performance): DynamoDB UpdateItem is atomic
 * - Domaine 1 (Sécurité): User can only update their own data
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

        // Parse request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing request body' }),
            };
        }

        const preferences: UserPreferences = JSON.parse(event.body);

        // Validate preferences
        const validation = validatePreferences(preferences);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: validation.error }),
            };
        }

        const timestamp = new Date().toISOString();

        // Update preferences in DynamoDB
        await dynamodb.send(new UpdateItemCommand({
            TableName: USERS_TABLE_NAME,
            Key: {
                user_id: { S: userId },
            },
            UpdateExpression: 'SET preferences = :preferences, updated_at = :updated_at',
            ExpressionAttributeValues: {
                ':preferences': { S: JSON.stringify(preferences) },
                ':updated_at': { S: timestamp },
            },
            ReturnValues: 'ALL_NEW',
        }));

        console.log(`Preferences updated for user: ${userId}`);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                preferences,
                updated_at: timestamp,
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
 * Validate preferences
 */
function validatePreferences(preferences: UserPreferences): { valid: boolean; error?: string } {
    // Validate theme
    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
        return { valid: false, error: 'Invalid theme. Must be: light, dark, or auto' };
    }

    // Validate notifications
    if (preferences.notifications !== undefined && typeof preferences.notifications !== 'boolean') {
        return { valid: false, error: 'Notifications must be a boolean' };
    }

    // Validate language
    if (preferences.language && !/^[a-z]{2}$/.test(preferences.language)) {
        return { valid: false, error: 'Invalid language code. Must be 2-letter ISO code (e.g., en, fr)' };
    }

    // Validate timezone
    if (preferences.timezone && preferences.timezone.length > 50) {
        return { valid: false, error: 'Invalid timezone' };
    }

    return { valid: true };
}
