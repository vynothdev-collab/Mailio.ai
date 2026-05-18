const STATE_KEY = "mailio.linkedinOauthState";
const LINKEDIN_AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_LOGOUT_URL = "https://www.linkedin.com/m/logout/";
const SCOPE = "openid profile email";
const LOGOUT_POPUP_MS = 2500;

export interface LinkedinConfig {
  clientId: string;
  redirectUri: string;
}

const CALLBACK_PATH = "/auth/linkedin/callback";

export function getLinkedinConfig(): LinkedinConfig | null {
  const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
  if (!clientId || typeof window === "undefined") return null;
  const redirectUri = `${window.location.origin}${CALLBACK_PATH}`;
  return { clientId, redirectUri };
}

function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function beginLinkedinAuth(config: LinkedinConfig): void {
  const state = generateState();
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: SCOPE,
    state,
    prompt: "login",
  });
  const authorizeUrl = `${LINKEDIN_AUTHORIZE_URL}?${params.toString()}`;

  const left = Math.max(0, Math.floor((window.screen.width - 480) / 2));
  const top = Math.max(0, Math.floor((window.screen.height - 560) / 2));
  const popup = window.open(
    LINKEDIN_LOGOUT_URL,
    "linkedin-logout",
    `width=480,height=560,left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );

  if (!popup) {
    window.location.assign(authorizeUrl);
    return;
  }

  try {
    popup.focus();
  } catch {
  }

  window.setTimeout(() => {
    try {
      popup.close();
    } catch {
    }
    window.location.assign(authorizeUrl);
  }, LOGOUT_POPUP_MS);
}

export function consumeLinkedinState(received: string | null): boolean {
  const stored = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!stored || !received) return false;
  return stored === received;
}
