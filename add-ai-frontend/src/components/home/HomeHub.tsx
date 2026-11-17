import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileText, MessageSquare } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";

export const PENDING_PROMPT_KEY = "audito_pending_prompt";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Working late";
}

export function HomeHub() {
  const { user } = useAuth();
  const { conversations, createConversation, selectConversation, activeConversation } = useChat();
  const preparedRef = useRef(false);
  const navigate = useNavigate();
  const firstName = user?.name?.split(" ")[0];

  // Land on a clean, empty conversation: a PDF attached here and the question
  // typed here must belong to the same session (the conversation id is the
  // backend session_id), and must not leak into a previously open chat.
  useEffect(() => {
    if (preparedRef.current) return; // guards against double-invoked effects
    preparedRef.current = true;
    // History conversations from the backend also have messages: [] until they are
    // opened, so "untouched" means a locally created, still-titled "New Chat".
    const isFresh = (c: { title: string; messages: unknown[] }) => c.title === "New Chat" && c.messages.length === 0;
    if (activeConversation && isFresh(activeConversation)) return;
    const empty = conversations.find(isFresh);
    if (empty) selectConversation(empty.id);
    else createConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The chat page sends the prompt once it has mounted with this conversation active.
  function startChat(text: string) {
    try {
      window.sessionStorage.setItem(PENDING_PROMPT_KEY, text);
    } catch {
      /* storage unavailable: the chat just opens empty */
    }
    navigate({ to: "/chat" });
  }

  return (
    <div className="home-bg flex h-full flex-col items-center justify-center overflow-y-auto px-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center text-center"
      >
        <h1 className="font-display text-4xl font-normal tracking-tight md:text-5xl">
          {getGreeting()}
          {firstName ? (
            <>
              , <span className="text-highlight">{firstName}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">What would you like to work on today?</p>
      </motion.div>

      <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
        <FeatureChip icon={MessageSquare} label="Chat with PDF" onClick={() => navigate({ to: "/chat" })} />
        <FeatureChip icon={FileText} label="Summarize" onClick={() => navigate({ to: "/summarize" })} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="mt-6 w-full max-w-3xl"
      >
        <ChatInput large onSubmitText={startChat} />
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Attach a PDF with the paperclip, then ask a question. Answers are cited to the page.
        </p>
      </motion.div>
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-brand/50 hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="h-4 w-4 text-brand" />
      {label}
    </button>
  );
}
