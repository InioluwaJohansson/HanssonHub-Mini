export const isBiometricAvailable = async () => {
  if (window.PublicKeyCredential) {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }
  return false;
};

export const registerBiometric = async (username: string) => {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  
  const userID = new Uint8Array(16);
  window.crypto.getRandomValues(userID);

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: "Home Security App" },
        user: {
          id: userID,
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    });
    
    if (credential) {
      localStorage.setItem('biometric_registered', 'true');
      return true;
    }
  } catch (e) {
    console.error("Biometric registration failed:", e);
    return false;
  }
  return false;
};

export const authenticateBiometric = async () => {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        userVerification: "required",
        timeout: 60000
      }
    });
    
    if (assertion) {
      return true;
    }
  } catch (e) {
    console.error("Biometric authentication failed:", e);
    return false;
  }
  return false;
};

export const saveBiometricStoredToken = (token: string) => {
  localStorage.setItem('biometric_stored_token', token);
};

export const getBiometricStoredToken = () => {
  return localStorage.getItem('biometric_stored_token');
};
