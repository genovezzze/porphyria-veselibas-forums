"use client";

import * as React from "react";
import { Mic, MicOff, PhoneOff, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceOrb, type VoiceState } from "./VoiceOrb";
import { useDemo } from "@/lib/store";

// Real OpenAI Realtime voice via WebRTC. The persistent API key stays on the
// server; we fetch a short-lived client secret from /api/realtime/session and
// use it to establish the peer connection directly with OpenAI.

const STATE_LABEL: Record<VoiceState, string> = {
  off: "Mikrofons izslēgts",
  connecting: "Savienojas…",
  listening: "Klausās",
  speaking: "Runā",
  lost: "Savienojums zudis",
  unavailable: "Balss nav pieejama",
};

export function VoicePanel() {
  const demo = useDemo();
  const { addMessage, upsertMessage, removeMessage } = demo;
  const [state, setState] = React.useState<VoiceState>("off");
  const [error, setError] = React.useState<string | null>(null);

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const dcRef = React.useRef<RTCDataChannel | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Accumulate transcript deltas per response/item before committing to chat.
  const partials = React.useRef<Record<string, { role: "user" | "assistant"; text: string }>>({});
  const handledCalls = React.useRef(new Set<string>());
  const committedTranscripts = React.useRef(new Set<string>());

  const cleanup = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => s.track?.stop());
      pcRef.current.close();
      pcRef.current = null;
    }
    // Stop every microphone track explicitly.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    partials.current = {};
    handledCalls.current.clear();
    committedTranscripts.current.clear();
  }, []);

  const endConversation = React.useCallback(() => {
    cleanup();
    setState("off");
  }, [cleanup]);

  React.useEffect(() => () => cleanup(), [cleanup]);

  function commitPartial(id: string) {
    if (committedTranscripts.current.has(id)) {
      delete partials.current[id];
      return;
    }
    const p = partials.current[id];
    if (p && p.text.trim()) {
      addMessage({ role: p.role, content: p.text.trim(), channel: "voice" });
      committedTranscripts.current.add(id);
    }
    delete partials.current[id];
  }

  async function runToolCall(evt: any) {
    const callId = evt.call_id || evt.item?.call_id;
    const name = evt.name || evt.item?.name;
    const rawArguments = evt.arguments || evt.item?.arguments || "{}";
    if (!callId || !name || handledCalls.current.has(callId)) return;
    handledCalls.current.add(callId);

    let args: unknown = {};
    try {
      args = JSON.parse(rawArguments);
    } catch {
      args = {};
    }

    let output: unknown = { ok: false, error: "Tool request failed." };
    try {
      const res = await fetch("/api/realtime/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          arguments: args,
          today: demo.today,
          preferences: demo.preferences,
        }),
      });
      output = await res.json();
      const result = output as {
        preferences?: typeof demo.preferences;
        careMatches?: typeof demo.careMatches;
      };
      if (result.preferences) demo.setPreferences(result.preferences);
      if (Array.isArray(result.careMatches)) {
        demo.setCareMatches(result.careMatches);
        if (result.careMatches.length > 0) {
          demo.setBookingStage("provider_search");
          demo.setReferralStatus("booking");
        }
      }
    } catch {
      output = { ok: false, error: "Tool request failed." };
    }

    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(output),
        },
      })
    );
    dc.send(JSON.stringify({ type: "response.create" }));
  }

  function handleEvent(evt: any) {
    switch (evt.type) {
      case "input_audio_buffer.speech_started":
        setState("listening");
        break;
      case "response.audio.delta":
      case "response.output_audio.delta":
        setState("speaking");
        break;
      // User's own speech. Reserve the slot as soon as the turn is committed, so
      // it stays before the assistant's reply even if transcription lands later.
      case "input_audio_buffer.committed":
        if (evt.item_id)
          upsertMessage({ id: "voice-" + evt.item_id, role: "user", content: "…", channel: "voice" });
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const text = (evt.transcript || "").trim();
        const id = "voice-" + (evt.item_id || crypto.randomUUID());
        if (text) upsertMessage({ id, role: "user", content: text, channel: "voice" });
        else removeMessage(id);
        break;
      }
      case "conversation.item.input_audio_transcription.failed":
        if (evt.item_id) removeMessage("voice-" + evt.item_id);
        break;
      // Assistant transcript streaming.
      case "response.audio_transcript.delta":
      case "response.output_audio_transcript.delta": {
        const id = evt.response_id || evt.item_id || "cur";
        partials.current[id] = {
          role: "assistant",
          text: (partials.current[id]?.text || "") + (evt.delta || ""),
        };
        break;
      }
      case "response.audio_transcript.done":
      case "response.output_audio_transcript.done": {
        const id = evt.response_id || evt.item_id || "cur";
        if (evt.transcript) partials.current[id] = { role: "assistant", text: evt.transcript };
        commitPartial(id);
        break;
      }
      case "response.done":
        setState("listening");
        break;
      case "response.function_call_arguments.done":
        void runToolCall(evt);
        break;
      case "response.output_item.done":
        if (evt.item?.type === "function_call") void runToolCall(evt);
        break;
      case "error":
        setError("Balss pakalpojums ziņoja par kļūdu.");
        break;
    }
  }

  async function start() {
    setError(null);
    setState("connecting");
    try {
      // 1. Mint an ephemeral session on the server.
      const sessionRes = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referral: demo.referral,
          bookingStage: demo.bookingStage,
        }),
      });
      if (!sessionRes.ok) {
        const data = await sessionRes.json().catch(() => ({}));
        setState("unavailable");
        setError(
          data?.error === "voice_unavailable"
            ? "Īstā balss šajā vidē nav konfigurēta. Vari izmantot teksta tērzēšanu."
            : data?.error || "Neizdevās sākt balss sesiju. Lūdzu, izmanto teksta tērzēšanu."
        );
        return;
      }
      const session = await sessionRes.json();
      const ephemeralKey: string = session.client_secret?.value;
      const maxSeconds: number = session.maxSessionSeconds ?? 300;

      // 2. Microphone — explicit user-initiated getUserMedia.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch {
        setState("unavailable");
        setError(
          "Neizdevās piekļūt mikrofonam. Pārbaudi pārlūka mikrofona atļauju vai izmanto teksta tērzēšanu."
        );
        return;
      }
      streamRef.current = stream;

      // 3. Peer connection.
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          setState("lost");
        }
      };

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => {
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Sāc sarunu proaktīvi un īsi. Izmanto aktīvā nosūtījuma kontekstu. Ja saruna vēl nav sākta, sasveicinies un pajautā par galveno bažu; ja tā jau sākta, turpini no pašreizējā posma.",
            },
          })
        );
      };
      dc.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch {
          /* ignore malformed */
        }
      };

      // 4. Offer / answer via OpenAI Realtime SDP endpoint.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpRes.ok) {
        cleanup();
        setState("lost");
        setError("Neizdevās izveidot balss savienojumu. Mēģini vēlreiz vai izmanto teksta tērzēšanu.");
        return;
      }
      const answer = { type: "answer" as const, sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);

      setState("listening");

      // 5. Enforce a wall-clock session cap so we don't burn voice minutes.
      timerRef.current = setTimeout(endConversation, maxSeconds * 1000);
    } catch {
      cleanup();
      setState("lost");
      setError("Sākot balss sesiju, radās kļūda. Lūdzu, izmanto teksta tērzēšanu.");
    }
  }

  const connected =
    state === "listening" || state === "speaking" || state === "lost";
  const connecting = state === "connecting";

  return (
    <div className="flex flex-1 flex-col">
      {/* Top (white): intro, orb and status */}
      <div className="flex flex-1 flex-col bg-white px-6 pt-6 pb-4">
      <div className="mb-3 self-start inline-flex items-center rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-[12px] text-black">
        AI skrīninga asistents
      </div>
      <h2 className="text-xl font-semibold text-black">Parunā par to</h2>
      <p className="mt-1 text-[15px] text-black">
        Mierīga balss saruna bez spiediena.
      </p>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center">
        <VoiceOrb state={state} />
        <div
          className="mt-3 flex items-center gap-2 text-[16px] font-medium text-black"
          role="status"
          aria-live="polite"
        >
          {state === "connecting" && (
            <Loader2 size={18} className="motion-safe:animate-spin text-accent" />
          )}
          {(state === "lost" || state === "unavailable") && (
            <AlertTriangle size={18} className="text-amber-500" />
          )}
          {STATE_LABEL[state]}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] text-amber-800">
          {error}
        </p>
      )}
      </div>

      {/* Bottom (gray): actions and the data notice */}
      <div className="bg-panel px-6 pt-4 pb-5">
      <div className="flex flex-col gap-3">
        {!connected ? (
          <Button
            onClick={start}
            disabled={connecting}
            className="min-h-[42px] rounded-full bg-accent text-[15px] text-white shadow-[0_4px_14px_rgba(36,116,245,0.3)] hover:bg-accent-hover"
          >
            <Mic size={17} /> {connecting ? "Savienojas…" : "Sākt sarunu"}
          </Button>
        ) : (
          <>
            <Button
              onClick={endConversation}
              className="min-h-[42px] rounded-full bg-danger text-[15px] text-white shadow-[0_4px_14px_rgba(229,72,77,0.3)] hover:bg-danger-hover"
            >
              <PhoneOff size={17} /> Beigt sarunu
            </Button>
            <Button
              variant="secondary"
              className="min-h-[42px] rounded-full border-accent/20 bg-accent-soft text-[15px] text-accent hover:bg-accent/15"
              onClick={() => {
                streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
                setState("off");
              }}
            >
              <MicOff size={18} /> Izslēgt mikrofonu
            </Button>
          </>
        )}
      </div>

      <p className="mt-3 text-[12px] text-black">
        Balss un teksts tiek nosūtīti OpenAI. Audio netiek saglabāts.
      </p>
      </div>

      {/* Hidden audio sink for the assistant's voice. */}
      <audio ref={audioRef} autoPlay className="hidden" />
    </div>
  );
}
