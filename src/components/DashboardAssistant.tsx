"use client";

import { FormEvent, useState } from "react";
import { answerQuestion } from "@/lib/assistant/answer";
import { formatTimestamp } from "@/lib/reports/format";
import type { Summary } from "@/lib/reports/summary";

interface Exchange {
  question: string;
  answer: string;
  time: string;
}

const SUGGESTIONS = [
  "How many files have I scanned?",
  "How many findings?",
  "What is the risk breakdown?",
  "What was my latest scan?",
];

// Answers come from the loaded summary, so they change with the user's data.
export function DashboardAssistant({ summary }: { summary: Summary }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const time = formatTimestamp(new Date().toISOString());
    setExchanges((items) => [...items, { question: trimmed, answer: answerQuestion(trimmed, summary), time }]);
    setQuestion("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <div className="assistant">
      {open && (
        <section className="assistant__panel" aria-labelledby="assistant-title">
          <header className="assistant__header">
            <span className="assistant__avatar" aria-hidden="true">A</span>
            <div className="assistant__heading">
              <p className="assistant__title" id="assistant-title">Dashboard assistant</p>
              <p className="assistant__status">Ask about your scans</p>
            </div>
            <button type="button" className="assistant__icon-button" aria-label="Close" onClick={() => setOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div className="assistant__log" role="log" aria-live="polite">
            <div className="assistant__message">
              <p className="assistant__bubble assistant__bubble--bot">Hi, how can I help you with your dashboard?</p>
            </div>
            {exchanges.map((item, index) => (
              <div key={index} className="assistant__turn">
                <div className="assistant__message assistant__message--user">
                  <p className="assistant__bubble assistant__bubble--user">{item.question}</p>
                  <time className="assistant__time">{item.time}</time>
                </div>
                <div className="assistant__message">
                  <p className="assistant__bubble assistant__bubble--bot">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>

          {exchanges.length === 0 && (
            <div className="assistant__chips">
              {SUGGESTIONS.map((text) => (
                <button key={text} type="button" className="assistant__chip" onClick={() => ask(text)}>
                  {text}
                </button>
              ))}
            </div>
          )}

          <form className="assistant__composer" onSubmit={handleSubmit}>
            <input
              id="assistant-question"
              className="assistant__input"
              type="text"
              placeholder="Write a message..."
              aria-label="Ask a question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button type="submit" className="assistant__send" aria-label="Ask" disabled={!question.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
          <p className="assistant__footer">Answers come from your live scan data.</p>
        </section>
      )}

      {!open && (
        <button type="button" className="assistant__launcher" onClick={() => setOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5h16v11H9l-5 4z" />
          </svg>
          Ask the dashboard
        </button>
      )}
    </div>
  );
}
