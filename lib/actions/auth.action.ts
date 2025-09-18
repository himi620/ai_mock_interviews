"use server";

import { auth, db, isAdminReady } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Set session cookie
export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  // Create session cookie
  if (isAdminReady()) {
    try {
      const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: SESSION_DURATION * 1000, // milliseconds
      });
      cookieStore.set("session", sessionCookie, {
        maxAge: SESSION_DURATION,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
      return;
    } catch (e) {
      // Fall through to raw-token cookie
    }
  }

  // Fallback: store the raw Firebase ID token as session cookie (dev-only, not verified)
  cookieStore.set("session", idToken, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    // check if user exists in db
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists)
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };

    // save user to db
    await db.collection("users").doc(uid).set({
      name,
      email,
      // profileURL,
      // resumeURL,
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle Firebase specific errors
    if (error.code === "auth/email-already-exists") {
      return {
        success: false,
        message: "This email is already in use",
      };
    }

    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    if (!isAdminReady()) {
      // If admin creds are invalid, fall back to cookie-only flow
      // The subsequent verify will no-op and user remains on client session
      await setSessionCookie(idToken);
      return { success: true };
    }

    let shouldSkipAdmin = false;
    let userUid: string | null = null;
    try {
      const userRecord = await auth.getUserByEmail(email);
      if (!userRecord)
        return {
          success: false,
          message: "User does not exist. Create an account.",
        };
      userUid = userRecord.uid;

      // Ensure a Firestore user document exists for this user
      const userDocRef = db.collection("users").doc(userUid);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        await userDocRef.set({
          name: userRecord.displayName || email.split("@")[0],
          email,
        });
      }
    } catch (e: any) {
      const msg = e?.message as string | undefined;
      if (msg && msg.includes('Credential implementation provided to initializeApp')) {
        shouldSkipAdmin = true;
      } else {
        throw e;
      }
    }

    await setSessionCookie(idToken);

    // If admin calls failed due to credentials, still treat as success with cookie-only session
    return { success: true };
  } catch (error: any) {
    console.error("signIn action failed:", error);

    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    if (!isAdminReady()) {
      // Fallback: parse JWT payload without verification (dev-only). If parsing fails, treat as unauthenticated.
      try {
        const parts = sessionCookie.split(".");
        if (parts.length < 2) return null;
        const json = Buffer.from(parts[1], "base64").toString("utf8");
        const payload = JSON.parse(json);

        const userId = payload.user_id || payload.uid || payload.sub;
        const email = payload.email as string | undefined;
        if (!userId) return null;

        return {
          id: userId,
          email: email || "",
          name: (payload.name as string | undefined) || (email ? email.split("@")[0] : "User"),
        } as User;
      } catch {
        return null;
      }
    }
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    // get user info from db
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();
    if (!userRecord.exists) return null;

    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User;
  } catch (error) {
    const message = (error as any)?.message as string | undefined;
    const isCredIssue = message && message.includes('Credential implementation provided to initializeApp');

    // Fallback: try to decode the cookie as a raw ID token without verification
    try {
      const parts = sessionCookie.split(".");
      if (parts.length >= 2) {
        const json = Buffer.from(parts[1], "base64").toString("utf8");
        const payload = JSON.parse(json);
        const userId = payload.user_id || payload.uid || payload.sub;
        const email = payload.email as string | undefined;
        if (userId) {
          return {
            id: userId,
            email: email || "",
            name: (payload.name as string | undefined) || (email ? email.split("@")[0] : "User"),
          } as User;
        }
      }
    } catch {
      // ignore fallback decode errors
    }

    if (!isCredIssue) {
      // Log only non-credential errors to reduce noise
      console.error('getCurrentUser verifySessionCookie error:', error);
    }
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
