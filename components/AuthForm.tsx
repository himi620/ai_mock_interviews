"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();

  const formSchema = authFormSchema(type);
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: prefillEmail,
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Attempt to create user record in Firestore (server-side)
        // signUp is a server action that writes the user document.
        const result = await signUp({
          uid: userCredential.user.uid,
          name: name!,
          email,
          password,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Account created successfully. Please sign in.");
        router.push("/sign-in");
      } else {
        const { email, password } = data;

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
          toast.error("Sign in Failed. Please try again.");
          return;
        }

        const result = await signIn({
          email,
          idToken,
        });

        if (!result || ("success" in result && !result.success)) {
          toast.error((result as any)?.message || "Failed to log into account. Please try again.");
          return;
        }

        toast.success("Signed in successfully.");
        router.replace("/");
        router.refresh();
      }
    } catch (rawError: unknown) {
      // Log full error for debugging (includes network/REST details from the SDK)
      console.error("AuthForm onSubmit error:", rawError);

      // Narrow the unknown error into a helpful shape
  const error = rawError as { message?: string; code?: string; response?: unknown };

      // Provide clearer user-facing messages for common Firebase Auth errors
      const message = error?.message || String(rawError);

      // Detect missing env vars check
      if (message.includes("Missing required Firebase environment variables")) {
        toast.error('Firebase configuration is missing. Please check your .env.local and ensure NEXT_PUBLIC_FIREBASE_* variables are set.');
        return;
      }

      // The Firebase client SDK surfaces REST errors with code and message.
      // If we have an httpErrorInfo object, include it in logs and show a friendly message.
      if (error?.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            {
              const emailInput = form.getValues("email") || "";
              toast.error('This email is already in use. Redirecting to sign in...');
              router.push(`/sign-in?email=${encodeURIComponent(emailInput)}`);
            }
            break;
          case 'auth/weak-password':
            toast.error('Password should be at least 6 characters long.');
            break;
          case 'auth/invalid-email':
            toast.error('Please enter a valid email address.');
            break;
          case 'auth/user-not-found':
            toast.error('No account found with this email. Please sign up first.');
            break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            toast.error('Incorrect email or password. Please try again.');
            break;
          case 'auth/too-many-requests':
            toast.error('Too many attempts. Please wait a bit or reset your password.');
            break;
          default:
            // If it's a REST 400 coming from identitytoolkit, show the raw message in console
            toast.error(`Sign up failed: ${error.message || error.code}`);
        }
      } else if (error?.response) {
        // e.g., fetch/axios style response (not typical from Firebase SDK, but helpful defensively)
        const resp = error.response as { status?: number; data?: unknown };
        console.error('HTTP response error details:', {
          status: resp.status,
          data: resp.data,
        });
        toast.error(`Sign up failed (HTTP ${resp.status ?? "unknown"}). Check console for details.`);
      } else {
        // Fallback: surface the SDK message
        toast.error(`There was an error: ${message}`);
      }
    }
  };

  const handleResetPassword = async () => {
    try {
      const email = form.getValues("email");
      if (!email) {
        toast.error("Please enter your email to reset the password.");
        return;
      }
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent. Check your inbox.");
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/user-not-found') {
        toast.error("No account found with this email.");
      } else if (code === 'auth/invalid-email') {
        toast.error("Please enter a valid email address.");
      } else {
        toast.error("Could not send reset email. Please try again later.");
      }
    }
  };

  const isSignIn = type === "sign-in";

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">AI Mock Interviews</h2>
        </div>

        <h3>Practice job interviews with AI</h3>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
          >
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Name"
                placeholder="Your Name"
                type="text"
              />
            )}

            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your email address"
              type="email"
            />

            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
            />

            <Button className="btn" type="submit">
              {isSignIn ? "Sign In" : "Create an Account"}
            </Button>

          {isSignIn && (
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-sm text-user-primary underline"
            >
              Forgot password?
            </button>
          )}
          </form>
        </Form>

        <p className="text-center">
          {isSignIn ? "No account yet?" : "Have an account already?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-bold text-user-primary ml-1"
          >
            {!isSignIn ? "Sign In" : "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
