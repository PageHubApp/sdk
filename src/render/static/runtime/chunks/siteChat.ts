// Site Chat for static-published pages: history on mount, `agent-send` →
// POST + SSE stream, turns rendered through the state-scoped repeater.
//
// Optional chunk — shipped as its own script only on pages with a chat
// composer (`getSiteChatScript`), run by bootstrap.ts with (__phRT, Alpine,
// PAGE_ID, PH_BASE) as arguments. Authored as a real TS function; `stringifyChunk`
// lifts the body. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).
//
// Contract (docs/features/site-chat.md §6–7):
//   GET  /api/site-chat/<siteId>/history → { available, ended, branding, turns }
//   POST /api/site-chat/<siteId>/message { content, pagePath } → SSE frames
//        `data: {"type": meta|text_delta|ended|done|error, ...}\n\n`
// Each `[data-ph-agent-chat]` root (id = its `agent-chat-<nodeId>` anchor)
// gets the same `<anchor>:*` state keys the React widget writes; the turns
// array goes to `<anchor>:turns`, which the preset's `scope: "turns"` Data
// node binds to (Data.toHTML via the chat's `staticScope.stateItem`).

import { stringifyChunk } from "./stringifyChunk";

export const SITE_CHAT_CHUNK = stringifyChunk(function $siteChat() {
  const { setState } = __phRT;

  type Turn = { id: string; role: string; content: string };
  type Chat = {
    root: HTMLElement;
    key: string;
    turns: Turn[];
    greeting: string;
    assistantName: string;
    accentColor: string;
    available: boolean;
    ended: boolean;
    rehydrating: boolean;
    sending: boolean;
    streaming: string;
    error: string;
  };

  const endpoint = PH_BASE + "/api/site-chat/" + encodeURIComponent(PAGE_ID);
  const SEND_FAILED = "Your message didn't send. Check your connection and try again.";
  const chats: Chat[] = [];
  let seq = 0;

  function flag(v: boolean) {
    return v ? "on" : "";
  }

  // Chat in a floating bubble hides with its bubble (trigger included).
  function setShown(c: Chat, shown: boolean) {
    const bubble = c.root.closest("[data-ph-agent-bubble]") as HTMLElement | null;
    const els = bubble ? [c.root, bubble] : [c.root];
    for (let i = 0; i < els.length; i++) els[i].style.display = shown ? "" : "none";
  }

  function write(c: Chat) {
    const turns = c.turns.slice();
    if (!turns.length && c.greeting && !c.rehydrating) {
      turns.push({ id: "__greeting__", role: "assistant", content: c.greeting });
    }
    if (c.sending) {
      turns.push({ id: "__streaming__", role: "assistant", content: c.streaming });
    }
    const values: Record<string, string> = {
      turns: JSON.stringify(turns),
      sending: flag(c.sending),
      rehydrating: flag(c.rehydrating),
      hasError: flag(!!c.error),
      hasTurns: flag(turns.length > 0),
      streamingText: c.streaming,
      error: c.error,
      assistantName: c.assistantName,
      accentColor: c.accentColor,
      isEditorPreview: "",
      available: flag(c.available),
      ended: flag(c.ended),
    };
    for (const k in values) {
      setState(
        c.key + ":" + k,
        { kind: "value", value: values[k], source: "runtime" },
        "site-chat"
      );
    }
    const controls = c.root.querySelectorAll(
      '[data-agent-send="true"], textarea, input'
    );
    for (let i = 0; i < controls.length; i++) {
      const el = controls[i] as HTMLInputElement;
      el.disabled = c.ended || (c.sending && el.getAttribute("data-agent-send") === "true");
    }
    const list = c.root.querySelector(
      '[data-state-scope="' + c.key + ':turns"]'
    ) as HTMLElement | null;
    if (list) {
      requestAnimationFrame(function () {
        list.scrollTop = list.scrollHeight;
      });
    }
  }

  function applyHistory(d: any) {
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      c.rehydrating = false;
      if (!d || d.available !== true) {
        c.available = false;
        setShown(c, false);
      } else {
        const b = d.branding || {};
        c.available = true;
        c.ended = !!d.ended;
        if (b.assistantName) c.assistantName = String(b.assistantName);
        c.greeting = b.greeting ? String(b.greeting) : "";
        c.accentColor = b.accentColor ? String(b.accentColor) : "";
        c.turns = Array.isArray(d.turns)
          ? d.turns.map(function (t: any) {
              return { id: String(t.id), role: String(t.role), content: String(t.content || "") };
            })
          : [];
        setShown(c, true);
      }
      write(c);
    }
  }

  function mount() {
    const roots = document.querySelectorAll("[data-ph-agent-chat]");
    if (!roots.length || !PAGE_ID) return;
    for (let i = 0; i < roots.length; i++) {
      const root = roots[i] as HTMLElement;
      if (!root.id) root.id = "agent-chat-" + i;
      const c: Chat = {
        root: root,
        key: root.id,
        turns: [],
        greeting: "",
        assistantName: "Assistant",
        accentColor: "",
        available: false,
        ended: false,
        rehydrating: true,
        sending: false,
        streaming: "",
        error: "",
      };
      chats.push(c);
      write(c);
    }
    // One conversation per site + visitor, so one call serves every root.
    fetch(endpoint + "/history", { credentials: "include" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(applyHistory)
      .catch(function () {
        applyHistory(null);
      });
  }

  function finishStreaming(c: Chat) {
    if (c.streaming) {
      c.turns.push({ id: "a" + ++seq, role: "assistant", content: c.streaming });
    }
    c.streaming = "";
  }

  function handleEvent(c: Chat, evt: any) {
    if (!evt || !evt.type) return;
    if (evt.type === "meta") {
      if (evt.assistantName) c.assistantName = String(evt.assistantName);
    } else if (evt.type === "text_delta") {
      c.streaming += String(evt.text || "");
    } else if (evt.type === "ended") {
      finishStreaming(c);
      if (evt.text) c.turns.push({ id: "a" + ++seq, role: "assistant", content: String(evt.text) });
      c.ended = true;
    } else if (evt.type === "done") {
      finishStreaming(c);
    } else if (evt.type === "error") {
      finishStreaming(c);
      c.error = String(evt.message || SEND_FAILED);
    }
    write(c);
  }

  // Splits the buffered stream into `data:` frames; returns the unparsed tail.
  function drainFrames(c: Chat, buf: string): string {
    let cut = buf.indexOf("\n\n");
    while (cut !== -1) {
      const frame = buf.slice(0, cut);
      buf = buf.slice(cut + 2);
      const lines = frame.split("\n");
      let data = "";
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].indexOf("data:") === 0) data += lines[i].slice(5).trim();
      }
      if (data) {
        try {
          handleEvent(c, JSON.parse(data));
        } catch (e) {}
      }
      cut = buf.indexOf("\n\n");
    }
    return buf;
  }

  function send(root: Element, text: string): boolean {
    let c: Chat | null = null;
    for (let i = 0; i < chats.length; i++) if (chats[i].root === root) c = chats[i];
    if (!c || !c.available || c.ended || c.sending || c.rehydrating) return false;
    const chat = c;
    chat.turns.push({ id: "u" + ++seq, role: "user", content: text });
    chat.sending = true;
    chat.streaming = "";
    chat.error = "";
    write(chat);
    fetch(endpoint + "/message", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ content: text, pagePath: window.location.pathname }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) {
          return res
            .json()
            .catch(function () {
              return null;
            })
            .then(function (b: any) {
              chat.error = (b && b.message) || SEND_FAILED;
            });
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        const pump = function (): Promise<void> {
          return reader.read().then(function (r) {
            if (r.value) buf = drainFrames(chat, buf + decoder.decode(r.value, { stream: true }));
            if (r.done) {
              drainFrames(chat, buf + decoder.decode() + "\n\n");
              return;
            }
            return pump();
          });
        };
        return pump();
      })
      .catch(function () {
        chat.error = SEND_FAILED;
      })
      .then(function () {
        finishStreaming(chat);
        chat.sending = false;
        write(chat);
      });
    return true;
  }

  // actions.ts's `agent-send` looks this up at click time.
  Object.assign(__phRT, { siteChatSend: send });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
});
