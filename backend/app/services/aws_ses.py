"""
Centralized AWS SES client configuration and validation
"""
import boto3
import os
from botocore.exceptions import ClientError, NoCredentialsError
from app.config import settings


def get_ses_client():
    """
    Create and return a configured SES client
    """
    try:
        client = boto3.client(
            "ses",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        return client
    except Exception as e:
        print(f"❌ Failed to create SES client: {str(e)}")
        raise


def validate_aws_credentials():
    """
    Validate AWS SES credentials at startup
    """
    print("\n🔍 Validating AWS SES Configuration...")
    
    # Check if credentials are loaded
    if not settings.AWS_ACCESS_KEY_ID:
        print("❌ AWS_ACCESS_KEY_ID not loaded from .env")
        return False
    
    if not settings.AWS_SECRET_ACCESS_KEY:
        print("❌ AWS_SECRET_ACCESS_KEY not loaded from .env")
        return False
    
    if not settings.AWS_REGION:
        print("❌ AWS_REGION not loaded from .env")
        return False
    
    if not settings.SES_SENDER_EMAIL:
        print("❌ SES_SENDER_EMAIL not loaded from .env")
        return False
    
    # Print configuration (masked credentials)
    print(f"   Region: {settings.AWS_REGION}")
    print(f"   Sender Email: {settings.SES_SENDER_EMAIL}")
    print(f"   Sender Name: {settings.SES_SENDER_NAME}")
    print(f"   Access Key ID: {settings.AWS_ACCESS_KEY_ID[:10]}...")
    
    # Test SES connection
    try:
        client = get_ses_client()
        # Try to get send quota to verify credentials
        response = client.get_send_quota()
        
        print(f"\n✅ AWS SES credentials validated successfully!")
        print(f"   Max Send Rate: {response['MaxSendRate']} emails/second")
        print(f"   Max 24 Hour Send: {response['Max24HourSend']}")
        print(f"   Sent Last 24 Hours: {response['SentLast24Hours']}\n")
        
        return True
        
    except NoCredentialsError:
        print("❌ AWS credentials not found")
        return False
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"❌ AWS SES validation failed:")
        print(f"   Error Code: {error_code}")
        print(f"   Error Message: {error_message}")
        
        if error_code == 'InvalidClientTokenId':
            print("\n💡 Troubleshooting:")
            print("   1. Check if AWS_ACCESS_KEY_ID is correct")
            print("   2. Verify the access key is active in AWS IAM")
            print("   3. Ensure the key has SES permissions")
        
        return False
    except Exception as e:
        print(f"❌ Unexpected error during validation: {str(e)}")
        return False
