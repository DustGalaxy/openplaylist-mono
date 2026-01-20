import secrets

import httpx


def get_authorization_url():
    """Generates the DonationAlerts authorization URL."""
    state = secrets.token_urlsafe(16)
    params = {
        "client_id": 15521,
        "redirect_uri": "http://localhost:3000/da-callback",
        "response_type": "code",
        "scope": "oauth-user-show oauth-donation-subscribe",
        "state": state,
    }
    request = httpx.Request("GET", "https://www.donationalerts.com/oauth/authorize", params=params)
    return str(request.url), state


print(get_authorization_url())
