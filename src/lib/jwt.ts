const SECRET = process.env.JWT_SECRET || "default_jwt_secret_nagar_ai_2026_secure_key";
const secretKeyBytes = new TextEncoder().encode(SECRET);

/**
 * Encodes an object to a base64url string
 */
function base64urlEncode(obj: any): string {
  const str = JSON.stringify(obj);
  // Use btoa safely on UTF-8 string
  const base64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Decodes a base64url string to an object
 */
function base64urlDecode(str: string): any {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const percentStr = atob(base64)
    .split("")
    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
    .join("");
  return JSON.parse(decodeURIComponent(percentStr));
}

/**
 * Signs a payload and returns a compact JWT
 */
export async function signJWT(payload: any): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64urlEncode(header);
  const encodedPayload = base64urlEncode({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
  });
  
  const tokenContent = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(tokenContent)
  );
  
  const signatureBytes = new Uint8Array(signature);
  let signatureString = "";
  for (let i = 0; i < signatureBytes.length; i++) {
    signatureString += String.fromCharCode(signatureBytes[i]);
  }
  
  const encodedSignature = btoa(signatureString)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  return `${tokenContent}.${encodedSignature}`;
}

/**
 * Verifies a compact JWT and returns its payload, or null if invalid
 */
export async function verifyJWT(token: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const tokenContent = `${encodedHeader}.${encodedPayload}`;
    
    const key = await crypto.subtle.importKey(
      "raw",
      secretKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const signatureBase64 = encodedSignature.replace(/-/g, "+").replace(/_/g, "/");
    const signatureBinaryString = atob(signatureBase64);
    const signatureBytes = new Uint8Array(signatureBinaryString.length);
    for (let i = 0; i < signatureBinaryString.length; i++) {
      signatureBytes[i] = signatureBinaryString.charCodeAt(i);
    }
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(tokenContent)
    );
    
    if (!isValid) return null;
    
    const payload = base64urlDecode(encodedPayload);
    
    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }
    
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
