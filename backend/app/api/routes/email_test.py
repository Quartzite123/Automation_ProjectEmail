from fastapi import APIRouter, HTTPException, Depends
from botocore.exceptions import ClientError
from app.services.aws_ses import get_ses_client
from app.config import settings
from app.auth.dependencies import require_admin
from app.models.user_model import CurrentUser

router = APIRouter()


@router.get("/test")
async def test_ses_connection(current_user: CurrentUser = Depends(require_admin)):
    """Verify SES configuration and credentials without sending a real email."""
    try:
        print("\n[SES] Configuration Check:")
        print(f"   Region:       {settings.AWS_REGION}")
        print(f"   Sender Email: {settings.SES_SENDER_EMAIL}")
        print(f"   Sender Name:  {settings.SES_SENDER_NAME}")
        print(f"   Access Key:   {settings.AWS_ACCESS_KEY_ID[:10]}...")

        ses = get_ses_client()
        # list_identities is a lightweight read call that verifies credentials + region.
        # Requires only ses:ListIdentities (lower privilege than ses:GetSendQuota).
        # Falls back gracefully if no verified identities exist yet.
        identities_resp = ses.list_identities(IdentityType="EmailAddress", MaxItems=10)
        verified_emails  = identities_resp.get("Identities", [])

        return {
            "status":          "success",
            "message":         "SES credentials and region are valid",
            "sender":          settings.SES_SENDER_EMAIL,
            "region":          settings.AWS_REGION,
            "verified_emails": verified_emails,
        }
    except ClientError as exc:
        code   = exc.response["Error"]["Code"]
        detail = exc.response["Error"]["Message"]
        print(f"\n[SES] Test Failed [{code}]: {detail}\n")
        raise HTTPException(
            status_code=502,
            detail={
                "status": "failed",
                "error":  f"{code}: {detail}",
                "troubleshooting": {
                    "sender_verification": "Ensure sender email is verified in AWS SES",
                    "sandbox_mode":        "In sandbox, recipient must also be verified",
                    "credentials":         "Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY",
                    "region":              "Ensure AWS_REGION matches your SES configuration",
                },
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"SES test error: {exc}")
