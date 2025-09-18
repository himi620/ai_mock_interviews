"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: Error) => {
      console.log("Error:", error);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("handleGenerateFeedback");

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    const formatErr = (err: unknown) => {
      try {
        if (err instanceof Error) {
          return `${err.name}: ${err.message}\n${err.stack}`;
        }
        return JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
      } catch {
        return String(err as unknown);
      }
    };

    try {
      const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
      if (type === "generate") {
        if (!workflowId) {
          throw new Error("Missing NEXT_PUBLIC_VAPI_WORKFLOW_ID. Add it to your .env and restart.");
        }
        await vapi.start(
          {
            name: "WorkflowRunner",
            voice: interviewer.voice,
            model: {
              provider: "vapi",
              // Use the existing workflow in Vapi
              workflowId,
              model: "workflow", // required by type, ignored by provider:vapi
            },
          },
          {
            variableValues: {
              username: userName,
              userid: userId,
            },
          }
        );
      } else {
        let formattedQuestions = "";
        if (questions) {
          formattedQuestions = questions
            .map((question) => `- ${question}`)
            .join("\\n");
        }

        await vapi.start(interviewer, {
          variableValues: {
            questions: formattedQuestions,
          },
        });
      }
    } catch (error) {
      // Log detailed error information to help diagnose opaque errors (like `{}`)
      console.error("vapi.start failed:", error);
      console.error("vapi.start failure (stringified):", formatErr(error));

      // Try a safe fallback when the provided ID refers to a non-existent assistant.
      const extractMessage = (err: unknown) => {
        if (err instanceof Error) return err.message;
        try {
          const e = err as unknown as Record<string, unknown> | null;
          if (e && typeof e === "object") {
            const potentialError = e["error"];
            if (potentialError && typeof potentialError === "object") {
              const msgVal = (potentialError as Record<string, unknown>)["message"];
              if (typeof msgVal === "string") return msgVal;
            }

            const directMessage = e["message"];
            if (typeof directMessage === "string") return directMessage;
          }
          return JSON.stringify(e);
        } catch {
          return String(err as unknown);
        }
      };

      const msg = extractMessage(error || "");
      if (String(msg || '').includes('Missing NEXT_PUBLIC_VAPI_WEB_TOKEN') || String(msg || '').includes('NEXT_PUBLIC_VAPI_WORKFLOW_ID')) {
        try { alert(String(msg)); } catch {}
        setCallStatus(CallStatus.INACTIVE);
        return;
      }

      // If we attempted to start using an assistant id (env var) that doesn't exist,
      // fallback to creating/starting a local assistant using the `interviewer` DTO.
      if (
        type === "generate" &&
        msg &&
        (msg.includes("assistantId") || msg.includes("Couldn't Get Assistant") || msg.includes("Does Not Exist") || msg.includes("Bad Request"))
      ) {
        console.warn("Assistant not found for provided ID; falling back to local interviewer assistant...");
        try {
          await vapi.start(interviewer, {
            variableValues: {
              username: userName,
              userid: userId,
            },
          });

          // If fallback succeeded, do not show the generic alert below.
          return;
        } catch (fallbackErr) {
          console.error("Fallback vapi.start(interviewer) failed:", fallbackErr);
          console.error("Fallback failure (stringified):", formatErr(fallbackErr));
        }
      }

      // Reset UI state so the call button isn't stuck on CONNECTING
      setCallStatus(CallStatus.INACTIVE);

      try {
        alert("Failed to start call. See console for details.");
      } catch {
        // ignore if alert is not available
      }
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
