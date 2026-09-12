"use client";

import { apiFetch } from "@/lib/apiClient";

/**
 * Хоёр тоглогчийн хооронд шууд WebRTC (P2P) холболт байгуулна.
 *
 * ЯАГААД POLLING ВЭ: холболт байгуулахын тулд хоёр тал SDP offer/answer ба
 * ICE candidate солилцох ёстой ("сигналчлал") — гэвч энэ солилцоо ЭХЭЛСЭН
 * үед хоёр тал хооронд ХЭЗЭЭ Ч шууд холбогдоогүй тул P2P-ээр дамжуулах
 * боломжгүй. Аппад WebSocket сервер, тохируулсан Redis байхгүй тул энэ
 * ганц удаагийн бэлтгэл шатыг `chess_signals` хүснэгтийг polling хийж
 * дамжуулна (`/api/play/rooms/[roomId]/signals`). `RTCDataChannel` НЭЭГДМЭГЦ
 * polling ЗОГСООД, цаашид бүх нүүдэл шууд P2P урсдаг.
 *
 * ⚠ ЗӨВХӨН Google-ийн НИЙТИЙН STUN хэрэглэнэ — TURN сервер байхгүй тул хатуу
 * хязгаарлалттай сүлжээ (жишээ нь корпорацийн NAT) дээрх тоглогчид холбогдож
 * чадахгүй байж болно. Энэ мэдэгдэж буй хязгаарлалт — v1-д зориулж зөвшөөрсөн.
 */

export type ChessPeerRole = "offerer" | "answerer";

/** SDP/ICE payload-ууд бие биетэйгээ огт өөр хэлбэртэй тул `unknown` — JSON.stringify хийхээс өөр юу ч хийхгүй. */
type SignalPayload = unknown;

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const POLL_INTERVAL_MS = 800;

export class ChessWebRTC {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private cursor: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  onOpen: (() => void) | null = null;
  onMessage: ((data: unknown) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(
    private roomId: string,
    private role: ChessPeerRole
  ) {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) void this.sendSignal("ice", event.candidate.toJSON());
    };

    if (role === "offerer") {
      this.bindChannel(this.pc.createDataChannel("chess"));
    } else {
      this.pc.ondatachannel = (event) => this.bindChannel(event.channel);
    }
  }

  /** Холболтыг эхлүүлнэ — polling асаана, offerer бол SDP offer илгээнэ. */
  async start(): Promise<void> {
    this.poll();

    if (this.role === "offerer") {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal("offer", offer);
    }
  }

  /** `RTCDataChannel`-аар мессеж илгээнэ — холболт нээлттэй үед л ажиллана. */
  send(data: unknown): void {
    if (this.channel?.readyState === "open") {
      this.channel.send(JSON.stringify(data));
    }
  }

  close(): void {
    this.closed = true;
    if (this.pollTimer !== null) clearTimeout(this.pollTimer);
    this.channel?.close();
    this.pc.close();
  }

  private bindChannel(channel: RTCDataChannel) {
    this.channel = channel;
    channel.onopen = () => {
      if (this.pollTimer !== null) clearTimeout(this.pollTimer);
      this.onOpen?.();
    };
    channel.onclose = () => this.onClose?.();
    channel.onmessage = (event) => {
      try {
        this.onMessage?.(JSON.parse(event.data));
      } catch {
        // Задлагдахгүй мессеж ирвэл үл тоомсорлоно — нөгөө тал эвдэрсэн
        // өгөгдөл илгээх ёсгүй, гэхдээ хамгаалалт хийхэд хямд.
      }
    };
  }

  private async sendSignal(type: string, payload: SignalPayload): Promise<void> {
    await apiFetch(`/api/play/rooms/${this.roomId}/signals`, {
      method: "POST",
      body: { type, payload },
    });
  }

  private poll(): void {
    const tick = async () => {
      if (this.closed) return;

      try {
        const query = this.cursor ? `?after=${encodeURIComponent(this.cursor)}` : "";
        const data = await apiFetch<{
          signals: { id: string; type: string; payload: string; createdAt: string }[];
        }>(`/api/play/rooms/${this.roomId}/signals${query}`);

        for (const signal of data.signals) {
          this.cursor = signal.createdAt;
          await this.handleSignal(signal.type, JSON.parse(signal.payload));
        }
      } catch {
        // Түр зуурын сүлжээний доголдол — дараагийн polling дахин оролдоно.
      }

      if (!this.closed) this.pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    void tick();
  }

  private async handleSignal(type: string, payload: SignalPayload): Promise<void> {
    if (type === "offer" && this.role === "answerer") {
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.sendSignal("answer", answer);
      return;
    }

    if (type === "answer" && this.role === "offerer") {
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
      return;
    }

    if (type === "ice") {
      try {
        await this.pc.addIceCandidate(payload as RTCIceCandidateInit);
      } catch {
        // Хугацаа хэтэрсэн/давхацсан candidate — холболтод нөлөөлөхгүй тул үл тоомсорлоно.
      }
    }
  }
}
