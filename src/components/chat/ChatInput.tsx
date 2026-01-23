"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentPicker } from "./AgentPicker";
import type { AgentId } from "@/types";

interface ChatInputProps {
  onSend: (message: string, mentions: AgentId[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Message the channel or @ mention someone",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState("");
  const [mentions, setMentions] = useState<AgentId[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Check for @ mention
    const lastAtIndex = newValue.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = newValue.slice(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(" ");

      if (!hasSpace) {
        setShowPicker(true);
        setPickerFilter(textAfterAt);
      } else {
        setShowPicker(false);
      }
    } else {
      setShowPicker(false);
    }
  };

  const handleAgentSelect = useCallback((agentId: AgentId) => {
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const before = value.slice(0, lastAtIndex);
      const newValue = `${before}@${agentId} `;
      setValue(newValue);
      setMentions((prev) => [...prev, agentId]);
    }
    setShowPicker(false);
    textareaRef.current?.focus();
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;

    // Extract mentions from the message
    const mentionMatches = value.match(/@(CFO|CRO|CPO|CMO|CSO|CTO|COO|CDO)/g);
    const extractedMentions = mentionMatches
      ? (mentionMatches.map((m) => m.slice(1)) as AgentId[])
      : [];

    onSend(value, extractedMentions);
    setValue("");
    setMentions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      {showPicker && (
        <AgentPicker
          isOpen={showPicker}
          filter={pickerFilter}
          onSelect={handleAgentSelect}
          onClose={() => setShowPicker(false)}
          position={{ top: -280, left: 0 }}
        />
      )}

      <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none",
            "min-h-[24px] max-h-32"
          )}
          style={{
            height: "auto",
            overflow: "hidden",
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            value.trim() && !disabled
              ? "bg-white text-black hover:bg-white/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
