"use client";

import { FormEvent, useState } from "react";
import { answerQuestion } from "@/lib/assistant/answer";
import type { Summary } from "@/lib/reports/summary";

interface Exchange {
  question: string;
  answer: string;
}

// Answers come from the loaded summary, so they change with the user's data.
export function DashboardAssistant({ summary }: { summary: Summary }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setExchanges((items) => [...items, { question: text, answer: answerQuestion(text, summary) }]);
    setQuestion("");
  }

  return (
    <div className="assistant">
      {open && (
        <section
          id="assistant-panel"
          className="lp-card lp-card--elevated lp-card--borderless assistant__panel"
          aria-labelledby="assistant-title"
        >
          <div className="lp-card__header">
            <div className="lp-card__title" id="assistant-title">Dashboard assistant</div>
          </div>
          <div className="lp-card__body form-stack">
            <div className="assistant__log" role="log" aria-live="polite">
              {exchanges.length === 0 && <p>Ask about your scans, findings or risk levels.</p>}
              {exchanges.map((item, index) => (
                <div key={index} className="assistant__exchange">
                  <p><strong>You:</strong> {item.question}</p>
                  <p><strong>Assistant:</strong> {item.answer}</p>
                </div>
              ))}
            </div>

            <form className="assistant__form" onSubmit={handleSubmit}>
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="assistant-question">Ask a question</label>
                <div className="lp-input__field">
                  <input
                    id="assistant-question"
                    className="lp-input__input"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                </div>
              </div>
              <button className="lp-button lp-button--primary lp-button--md" type="submit" disabled={!question.trim()}>
                Ask
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        className="lp-button lp-button--primary lp-button--md"
        aria-expanded={open}
        aria-controls="assistant-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close assistant" : "Ask the dashboard"}
      </button>
    </div>
  );
}
