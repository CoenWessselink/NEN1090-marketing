import os
import requests
from typing import Any, Dict, Optional

MOLLIE_API_BASE = "https://api.mollie.com/v2"

class MollieError(RuntimeError):
    pass

def _api_key() -> str:
    key = os.getenv("MOLLIE_API_KEY", "").strip()
    if not key:
        raise MollieError("MOLLIE_API_KEY not set")
    return key

def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
    }

def _req(method: str, path: str, json_body: Optional[dict]=None, params: Optional[dict]=None) -> Dict[str, Any]:
    url = f"{MOLLIE_API_BASE}{path}"
    r = requests.request(method, url, headers=_headers(), json=json_body, params=params, timeout=25)
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text}
    if r.status_code >= 400:
        raise MollieError(f"Mollie API {r.status_code}: {data}")
    return data

def create_customer(name: str, email: str, metadata: Optional[dict]=None) -> Dict[str, Any]:
    body = {"name": name, "email": email}
    if metadata:
        body["metadata"] = metadata
    return _req("POST", "/customers", json_body=body)

def create_subscription(customer_id: str, amount_cents: int, currency: str, interval: str, description: str, webhook_url: str, metadata: Optional[dict]=None) -> Dict[str, Any]:
    # Mollie expects amount.value as string with 2 decimals
    value = f"{amount_cents/100:.2f}"
    body = {
        "amount": {"currency": currency, "value": value},
        "interval": interval,
        "description": description,
        "webhookUrl": webhook_url,
    }
    if metadata:
        body["metadata"] = metadata
    return _req("POST", f"/customers/{customer_id}/subscriptions", json_body=body)

def update_subscription(customer_id: str, subscription_id: str, amount_cents: int, currency: str, description: Optional[str]=None, webhook_url: Optional[str]=None, interval: Optional[str]=None, metadata: Optional[dict]=None) -> Dict[str, Any]:
    value = f"{amount_cents/100:.2f}"
    body: Dict[str, Any] = {"amount": {"currency": currency, "value": value}}
    if description is not None:
        body["description"] = description
    if webhook_url is not None:
        body["webhookUrl"] = webhook_url
    if interval is not None:
        body["interval"] = interval
    if metadata is not None:
        body["metadata"] = metadata
    return _req("PATCH", f"/customers/{customer_id}/subscriptions/{subscription_id}", json_body=body)

def cancel_subscription(customer_id: str, subscription_id: str) -> Dict[str, Any]:
    return _req("DELETE", f"/customers/{customer_id}/subscriptions/{subscription_id}")

def get_payment(payment_id: str) -> Dict[str, Any]:
    return _req("GET", f"/payments/{payment_id}")

def list_payments(customer_id: str, limit: int = 250) -> Dict[str, Any]:
    return _req("GET", "/payments", params={"customerId": customer_id, "limit": limit})


def get_subscription(customer_id: str, subscription_id: str) -> Dict[str, Any]:
    return _req("GET", f"/customers/{customer_id}/subscriptions/{subscription_id}")
