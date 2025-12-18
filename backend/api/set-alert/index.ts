import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

const dynamodb = new DynamoDBClient({});
const ALERTS_TABLE_NAME = process.env.ALERTS_TABLE_NAME!;

interface AlertRequest {
    wallet_address: string;
    condition: 'balance_above' | 'balance_below' | 'transaction_detected';
    threshold?: string;
    notification_email?: string;
}

/**
 * Lambda: Set Alert
 * 
 * Flow:
 * 1. Extract user_id from Cognito token
 * 2. Validate input
 * 3. Create alert in DynamoDB
 * 4. Return alert_id
 * 
 * Concept SAA-C03:
 * - Domaine 1 (Sécurité): Cognito Authorizer validates user_id
 * - Domaine 2 (Résilience): DynamoDB Multi-AZ automatic
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

        const alertRequest: AlertRequest = JSON.parse(event.body);

        // Validate input
        const validation = validateAlertRequest(alertRequest);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: validation.error }),
            };
        }

        // Generate alert_id
        const alertId = `alert-${randomUUID()}`;
        const timestamp = new Date().toISOString();

        // Store alert in DynamoDB
        await dynamodb.send(new PutItemCommand({
            TableName: ALERTS_TABLE_NAME,
            Item: {
                user_id: { S: userId },
                alert_id: { S: alertId },
                wallet_address: { S: alertRequest.wallet_address.toLowerCase() },
                condition: { S: alertRequest.condition },
                threshold: { S: alertRequest.threshold || '0' },
                notification_email: { S: alertRequest.notification_email || '' },
                status: { S: 'active' },
                created_at: { S: timestamp },
                updated_at: { S: timestamp },
            },
        }));

        console.log(`Alert created: ${alertId} for user: ${userId}`);

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                alert_id: alertId,
                user_id: userId,
                wallet_address: alertRequest.wallet_address,
                condition: alertRequest.condition,
                threshold: alertRequest.threshold,
                status: 'active',
                created_at: timestamp,
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
 * Validate alert request
 */
function validateAlertRequest(request: AlertRequest): { valid: boolean; error?: string } {
    // Validate wallet address
    if (!request.wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(request.wallet_address)) {
        return { valid: false, error: 'Invalid Ethereum address format' };
    }

    // Validate condition
    const validConditions = ['balance_above', 'balance_below', 'transaction_detected'];
    if (!request.condition || !validConditions.includes(request.condition)) {
        return { valid: false, error: 'Invalid condition. Must be: balance_above, balance_below, or transaction_detected' };
    }

    // Validate threshold for balance conditions
    if ((request.condition === 'balance_above' || request.condition === 'balance_below') && !request.threshold) {
        return { valid: false, error: 'Threshold is required for balance conditions' };
    }

    // Validate threshold is a number
    if (request.threshold && isNaN(parseFloat(request.threshold))) {
        return { valid: false, error: 'Threshold must be a valid number' };
    }

    return { valid: true };
}
