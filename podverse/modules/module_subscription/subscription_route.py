
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from connection_supabase_client import (
    get_authenticated_supabase_client,
    get_service_role_client,
)

# Initialize Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")

# Initialize Supabase (service role client for server-side mutations)
supabase = get_service_role_client()

router = APIRouter()

# Define Stripe Price IDs (replace with actual values from Stripe dashboard)
PRICE_IDS = {
    "pro": "price_1SX2TfG6IjGasSqP9JDdJjkZ",
    "enterprise": "price_1SX2WcG6IjGasSqPGrOfvI53",
}
PLAN_LOOKUP_BY_PRICE = {price_id: plan for plan, price_id in PRICE_IDS.items()}


def _serialize_timestamp(epoch_seconds: int) -> str:
    """Return ISO timestamp with timezone information for Supabase storage."""
    return datetime.fromtimestamp(epoch_seconds, tz=timezone.utc).isoformat()


def _parse_supabase_timestamp(value: str) -> datetime:
    """Parse Supabase timestamptz string into aware datetime."""
    if not value:
        raise ValueError("Missing timestamp value")
    sanitized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(sanitized)


def _get_existing_plan(subscription_id: str) -> Optional[str]:
    """Fetch previously stored plan for fallback purposes."""
    result = supabase.table("subscriptions")\
        .select("plan")\
        .eq("stripe_subscription_id", subscription_id)\
        .limit(1)\
        .execute()

    if result.data:
        return result.data[0].get("plan")
    return None


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: Request, auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Create a Stripe Checkout Session for subscription
    """
    try:
        body = await request.json()
        user_id = auth_data["user_id"]
        plan = body.get("plan", "pro")
        email = body.get("email") or auth_data.get("user_email")

        if plan not in PRICE_IDS:
            raise HTTPException(status_code=400, detail="Invalid plan selected.")

        if not email:
            raise HTTPException(status_code=400, detail="User email not available.")

        # Get or create Stripe customer
        customer_id = await get_or_create_customer(user_id, email)

        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            client_reference_id=user_id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price": PRICE_IDS[plan],
                "quantity": 1,
            }],
            success_url=f"{FRONTEND_BASE_URL}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_BASE_URL}/subscription",
            metadata={
                "user_id": user_id,
                "plan": plan
            }
        )

        return JSONResponse({"checkout_url": session.url})

    except Exception as e:
        print(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-portal-session")
async def create_portal_session(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """
    Create Stripe Customer Portal session for managing subscription
    """
    try:
        user_id = auth_data["user_id"]

        # Get customer ID from database
        result = supabase.table("subscriptions")\
            .select("stripe_customer_id")\
            .eq("user_id", user_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="No subscription found")

        customer_id = result.data[0]["stripe_customer_id"]

        # Create portal session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{FRONTEND_BASE_URL}/settings",
        )

        return JSONResponse({"url": session.url})

    except Exception as e:
        print(f"Error creating portal session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscription/status")
async def get_subscription_status(auth_data: dict = Depends(get_authenticated_supabase_client)):
    """
    Check user's subscription status
    """
    try:
        user_id = auth_data["user_id"]
        result = supabase.table("subscriptions")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()

        if not result.data:
            # Get subscription_status from profiles if no subscription exists
            profile_result = supabase.table("profiles")\
                .select("subscription_status")\
                .eq("id", user_id)\
                .execute()
            
            profile_subscription_status = profile_result.data[0].get("subscription_status", "free") if profile_result.data else "free"
            
            return JSONResponse({
                "status": "none",
                "plan": "free",
                "subscription_status": profile_subscription_status,
                "is_active": False,
                "current_period_end": None,
                "stripe_subscription_id": None
            })

        subscription = result.data[0]
        
        # Check if subscription is still active
        current_period_end = _parse_supabase_timestamp(subscription["current_period_end"])
        is_active = subscription["status"] in {"active", "trialing"} and current_period_end > datetime.now(timezone.utc)
        
        plan = subscription.get("plan", "free")
        
        # Get subscription_status from profiles table
        profile_result = supabase.table("profiles")\
            .select("subscription_status")\
            .eq("id", user_id)\
            .execute()
        
        profile_subscription_status = profile_result.data[0].get("subscription_status", plan) if profile_result.data else plan

        return JSONResponse({
            "status": subscription["status"],
            "is_active": is_active,
            "plan": plan,
            "subscription_status": profile_subscription_status,  # From profiles table
            "current_period_end": subscription["current_period_end"],
            "stripe_subscription_id": subscription["stripe_subscription_id"]
        })

    except Exception as e:
        print(f"Error checking subscription status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subscription/verify-session")
async def verify_checkout_session(
    request: Request, auth_data: dict = Depends(get_authenticated_supabase_client)
):
    """
    Manually verify a checkout session and sync subscription from Stripe
    This is useful when webhooks haven't fired yet
    """
    try:
        body = await request.json()
        session_id = body.get("session_id")
        user_id = auth_data["user_id"]

        if not session_id:
            raise HTTPException(status_code=400, detail="Session ID required")

        # Retrieve the checkout session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)

        # Verify it belongs to this user
        session_user_id = session.metadata.get("user_id") or session.client_reference_id
        if session_user_id != user_id:
            raise HTTPException(status_code=403, detail="Session does not belong to this user")

        # If payment was successful and subscription exists, sync it
        if session.payment_status == "paid" and session.subscription:
            subscription_id = session.subscription
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            plan = session.metadata.get("plan") or PLAN_LOOKUP_BY_PRICE.get(
                subscription["items"]["data"][0]["price"]["id"], "pro"
            )

            # Get current_period_end safely
            current_period_end = subscription.get("current_period_end")
            if current_period_end:
                current_period_end_iso = _serialize_timestamp(current_period_end)
            else:
                # Default to 30 days from now if not set
                current_period_end_iso = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

            # Sync to database
            supabase.table("subscriptions").upsert({
                "user_id": user_id,
                "stripe_customer_id": session.customer,
                "stripe_subscription_id": subscription_id,
                "status": subscription.status,
                "plan": plan or "pro",
                "current_period_end": current_period_end_iso,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }, on_conflict="user_id").execute()

            # Update profiles.subscription_status
            supabase.table("profiles").update({
                "subscription_status": plan or "pro"
            }).eq("id", user_id).execute()

            return JSONResponse({
                "verified": True,
                "status": subscription.status,
                "plan": plan or "pro"
            })

        return JSONResponse({
            "verified": False,
            "message": "Payment not completed yet"
        })

    except stripe.error.StripeError as e:
        print(f"Stripe error verifying session: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        print(f"Error verifying session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle different event types
    if event.type == "checkout.session.completed":
        await handle_checkout_completed(event.data.object)
    
    elif event.type == "invoice.paid":
        await handle_invoice_paid(event.data.object)
    
    elif event.type == "invoice.payment_failed":
        await handle_payment_failed(event.data.object)
    
    elif event.type == "customer.subscription.updated":
        await handle_subscription_updated(event.data.object)
    
    elif event.type == "customer.subscription.deleted":
        await handle_subscription_deleted(event.data.object)

    return JSONResponse({"status": "success"})


# Helper Functions

async def get_or_create_customer(user_id: str, email: str) -> str:
    """
    Get existing Stripe customer or create new one
    """
    # Check if customer already exists in database
    result = supabase.table("subscriptions")\
        .select("stripe_customer_id")\
        .eq("user_id", user_id)\
        .execute()

    if result.data and result.data[0].get("stripe_customer_id"):
        return result.data[0]["stripe_customer_id"]

    # Create new Stripe customer
    customer = stripe.Customer.create(
        email=email,
        metadata={"user_id": user_id}
    )

    # Save customer to database (even without subscription yet)
    supabase.table("subscriptions").upsert({
        "user_id": user_id,
        "stripe_customer_id": customer.id,
        "status": "incomplete",
        "plan": "free",
        "current_period_end": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }, on_conflict="user_id").execute()

    # Ensure profiles.subscription_status is set to free
    try:
        supabase.table("profiles").update({
            "subscription_status": "free"
        }).eq("id", user_id).execute()
    except Exception as e:
        print(f"Warning: Could not update profiles.subscription_status: {e}")

    return customer.id


async def handle_checkout_completed(session):
    """
    Handle successful checkout - create/update subscription in database
    """
    user_id = session.metadata.get("user_id") or session.client_reference_id
    customer_id = session.customer
    subscription_id = session.subscription

    # Get subscription details from Stripe
    subscription = stripe.Subscription.retrieve(subscription_id)
    plan = session.metadata.get("plan") or PLAN_LOOKUP_BY_PRICE.get(
        subscription["items"]["data"][0]["price"]["id"], "pro"
    )

    # Get current_period_end safely
    current_period_end = subscription.get("current_period_end")
    if current_period_end:
        current_period_end_iso = _serialize_timestamp(current_period_end)
    else:
        current_period_end_iso = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    # Save to database
    supabase.table("subscriptions").upsert({
        "user_id": user_id,
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
        "status": subscription.status,
        "plan": plan or "pro",
        "current_period_end": current_period_end_iso,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }, on_conflict="user_id").execute()

    # Update profiles.subscription_status
    supabase.table("profiles").update({
        "subscription_status": plan or "pro"
    }).eq("id", user_id).execute()

    print(f"✅ Subscription created for user {user_id}")


async def handle_invoice_paid(invoice):
    """
    Handle successful payment - renew subscription
    """
    subscription_id = invoice.subscription
    
    if not subscription_id:
        return

    subscription = stripe.Subscription.retrieve(subscription_id)

    # Get user_id from subscription
    sub_result = supabase.table("subscriptions")\
        .select("user_id, plan")\
        .eq("stripe_subscription_id", subscription_id)\
        .execute()
    
    user_id = sub_result.data[0]["user_id"] if sub_result.data else None
    current_plan = sub_result.data[0].get("plan", "pro") if sub_result.data else "pro"

    # Get current_period_end safely
    current_period_end = subscription.get("current_period_end")
    if current_period_end:
        current_period_end_iso = _serialize_timestamp(current_period_end)
    else:
        current_period_end_iso = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    # Update subscription in database
    supabase.table("subscriptions")\
        .update({
            "status": subscription.status,
            "current_period_end": current_period_end_iso,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("stripe_subscription_id", subscription_id)\
        .execute()

    # Update profiles.subscription_status if user_id exists
    if user_id:
        supabase.table("profiles").update({
            "subscription_status": current_plan
        }).eq("id", user_id).execute()

    print(f"✅ Subscription renewed: {subscription_id}")


async def handle_payment_failed(invoice):
    """
    Handle failed payment
    """
    subscription_id = invoice.subscription
    
    if not subscription_id:
        return

    # Update status to past_due
    supabase.table("subscriptions")\
        .update({
            "status": "past_due",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("stripe_subscription_id", subscription_id)\
        .execute()

    print(f"⚠️ Payment failed for subscription: {subscription_id}")


async def handle_subscription_updated(subscription):
    """
    Handle subscription updates (plan changes, cancellations, etc.)
    """
    subscription_id = subscription.id

    plan = PLAN_LOOKUP_BY_PRICE.get(
        subscription["items"]["data"][0]["price"]["id"],
        None,
    )
    existing_plan = _get_existing_plan(subscription_id)
    final_plan = plan or existing_plan or "pro"

    # Get user_id
    sub_result = supabase.table("subscriptions")\
        .select("user_id")\
        .eq("stripe_subscription_id", subscription_id)\
        .execute()
    
    user_id = sub_result.data[0]["user_id"] if sub_result.data else None

    # Get current_period_end safely
    current_period_end = subscription.get("current_period_end")
    if current_period_end:
        current_period_end_iso = _serialize_timestamp(current_period_end)
    else:
        current_period_end_iso = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    supabase.table("subscriptions")\
        .update({
            "status": subscription.status,
            "plan": final_plan,
            "current_period_end": current_period_end_iso,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("stripe_subscription_id", subscription_id)\
        .execute()

    # Update profiles.subscription_status
    if user_id:
        supabase.table("profiles").update({
            "subscription_status": final_plan
        }).eq("id", user_id).execute()

    print(f"🔄 Subscription updated: {subscription_id}")


async def handle_subscription_deleted(subscription):
    """
    Handle subscription cancellation
    """
    subscription_id = subscription.id

    # Get user_id before updating
    sub_result = supabase.table("subscriptions")\
        .select("user_id")\
        .eq("stripe_subscription_id", subscription_id)\
        .execute()
    
    user_id = sub_result.data[0]["user_id"] if sub_result.data else None

    supabase.table("subscriptions")\
        .update({
            "status": "canceled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("stripe_subscription_id", subscription_id)\
        .execute()

    # Update profiles.subscription_status to free
    if user_id:
        supabase.table("profiles").update({
            "subscription_status": "free"
        }).eq("id", user_id).execute()

    print(f"❌ Subscription canceled: {subscription_id}")