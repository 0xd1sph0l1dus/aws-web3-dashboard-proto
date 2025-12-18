import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * FrontendStackProps - Props pour FrontendStack
 */
export interface FrontendStackProps extends cdk.StackProps {
    apiUrl: string;
    userPoolId: string;
    userPoolClientId: string;
}

/**
 * FrontendStack - S3 + CloudFront pour Vue.js SPA
 * 
 * Services AWS :
 * - Amazon S3 (static website hosting)
 * - Amazon CloudFront (CDN global)
 * - CloudFront OAI (Origin Access Identity)
 * 
 * Concepts SAA-C03 :
 * - Domaine 3 (Performance) : CloudFront edge caching (400+ locations)
 * - Domaine 4 (Coût) : S3 + CloudFront < EC2 (serverless)
 * - Domaine 1 (Sécurité) : HTTPS obligatoire, OAI (pas d'accès S3 direct)
 */
export class FrontendStack extends cdk.Stack {
    public readonly distribution: cloudfront.Distribution;
    public readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: FrontendStackProps) {
        super(scope, id, props);

        /**
         * S3 Bucket pour le frontend
         * 
         * Concept SAA-C03 :
         * - Domaine 1 (Sécurité) : Pas de public access (CloudFront OAI uniquement)
         * - Domaine 4 (Coût) : S3 Standard (pas Glacier pour website)
         * - Domaine 2 (Résilience) : Versioning pour rollback
         */
        this.bucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `web3-dashboard-frontend-${this.account}`,

            // Sécurité : Pas d'accès public direct
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

            // Versioning pour rollback
            versioned: true,

            // Encryption at rest
            encryption: s3.BucketEncryption.S3_MANAGED,

            // Lifecycle : Supprimer les anciennes versions après 30 jours
            lifecycleRules: [
                {
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                },
            ],

            // Removal policy : RETAIN en prod (éviter suppression accidentelle)
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
        });

        // Tags
        cdk.Tags.of(this.bucket).add('Stack', 'Frontend');
        cdk.Tags.of(this.bucket).add('Service', 'S3');
        cdk.Tags.of(this.bucket).add('SAA-C03-Domain', 'Cost');

        /**
         * CloudFront Origin Access Identity (OAI)
         * 
         * Concept SAA-C03 :
         * - Domaine 1 (Sécurité) : CloudFront peut accéder à S3, mais pas les users directement
         * - Alternative : Origin Access Control (OAC) - plus récent
         */
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
            comment: 'OAI for Web3 Dashboard frontend',
        });

        // Grant CloudFront read access to S3
        this.bucket.grantRead(originAccessIdentity);

        /**
         * CloudFront Distribution
         * 
         * Concept SAA-C03 :
         * - Domaine 3 (Performance) : Edge caching (400+ locations)
         * - Domaine 1 (Sécurité) : HTTPS obligatoire (redirect HTTP → HTTPS)
         * - Domaine 4 (Coût) : Cache hit rate > 80% = économie sur S3 requests
         */
        this.distribution = new cloudfront.Distribution(this, 'Distribution', {
            comment: 'Web3 Dashboard Frontend CDN',

            // Origin : S3 bucket
            defaultBehavior: {
                origin: new origins.S3Origin(this.bucket, {
                    originAccessIdentity,
                }),

                // Viewer Protocol Policy : Redirect HTTP to HTTPS
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,

                // Allowed HTTP methods
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,

                // Cache policy
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,

                // Compress automatically
                compress: true,
            },

            // Default root object
            defaultRootObject: 'index.html',

            // Error responses (SPA routing)
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.seconds(10),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.seconds(10),
                },
            ],

            // Price class : Use only North America and Europe (cheaper)
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,

            // Enable IPv6
            enableIpv6: true,

            // HTTP version
            httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        });

        // Tags
        cdk.Tags.of(this.distribution).add('Stack', 'Frontend');
        cdk.Tags.of(this.distribution).add('Service', 'CloudFront');
        cdk.Tags.of(this.distribution).add('SAA-C03-Domain', 'Performance');

        /**
         * S3 Deployment
         * 
         * Concept SAA-C03 :
         * - Domaine 5 (Operational Excellence) : Déploiement automatique
         * - Invalidation CloudFront automatique après déploiement
         * 
         * NOTE: Uncomment after building the frontend (npm run build in frontend/)
         */
        // const deployment = new s3deploy.BucketDeployment(this, 'DeployFrontend', {
        //   sources: [s3deploy.Source.asset('../frontend/dist')],
        //   destinationBucket: this.bucket,
        //   distribution: this.distribution,
        //   distributionPaths: ['/*'], // Invalidate all cache
        // });

        /**
         * Create config.json for frontend
         * 
         * Ce fichier sera lu par le frontend pour connaître :
         * - API Gateway URL
         * - Cognito User Pool ID
         * - Cognito User Pool Client ID
         */
        const configContent = JSON.stringify({
            apiUrl: props.apiUrl,
            cognito: {
                userPoolId: props.userPoolId,
                userPoolClientId: props.userPoolClientId,
                region: this.region,
            },
            etherscan: {
                network: 'sepolia',
                apiUrl: 'https://api-sepolia.etherscan.io/api',
            },
        }, null, 2);

        // Store config in S3 (uncomment after first deployment)
        // new s3deploy.BucketDeployment(this, 'DeployConfig', {
        //   sources: [s3deploy.Source.jsonData('config.json', JSON.parse(configContent))],
        //   destinationBucket: this.bucket,
        //   distribution: this.distribution,
        //   distributionPaths: ['/config.json'],
        // });

        /**
         * CloudWatch Alarms
         * 
         * Concept SAA-C03 :
         * - Domaine 5 (Operational Excellence) : Monitoring proactif
         */
        const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
            metric: this.distribution.metric5xxErrorRate(),
            evaluationPeriods: 2,
            threshold: 5, // 5% error rate
            alarmDescription: 'CloudFront 5xx error rate is high (SAA-C03: Reliability)',
            alarmName: 'web3-dashboard-cloudfront-errors',
        });

        /**
         * Outputs
         */
        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: this.distribution.distributionDomainName,
            description: 'CloudFront distribution domain name (use this URL to access the app)',
            exportName: 'Web3DashboardDistributionDomain',
        });

        new cdk.CfnOutput(this, 'DistributionUrl', {
            value: `https://${this.distribution.distributionDomainName}`,
            description: 'Full HTTPS URL to access the application',
            exportName: 'Web3DashboardUrl',
        });

        new cdk.CfnOutput(this, 'BucketName', {
            value: this.bucket.bucketName,
            description: 'S3 bucket name for frontend assets',
            exportName: 'Web3DashboardBucketName',
        });
    }
}
