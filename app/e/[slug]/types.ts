export type SalesStatus = "on_sale" | "upcoming" | "ended" | "sold_out" | "locked";

export interface EventHost {
  name: string;
  avatarUrl: string | null;
  kind: "user" | "business" | "photographer";
  followId?: string | null;
}

export interface EventInfo {
  id: string;
  slug: string;
  /** paused: Outsyde put it on hold (p5-safety); only the host, co-hosts and ticket holders get it, with onHold true. */
  status: "draft" | "published" | "cancelled" | "paused";
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  addressHidden: boolean;
  addressRevealAt: string | null;
  refundPolicy: "no_refunds" | "until_cutoff";
  refundCutoffHours: number | null;
  visibility: "public" | "unlisted";
  soldOut: boolean;
  host: EventHost;
  viewerIsHost: boolean;
  /** Sent by the backend since p4-team step 2b; optional for older answers. */
  viewerIsCohost?: boolean;
  viewerHasTicket: boolean;
  /** p5-safety T10 (additive): Outsyde paused the event while it reviews it. Nothing is on sale. */
  onHold?: boolean;
}

export interface TicketType {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  serviceFeeCents: number | null;
  buyerTotalCents: number | null;
  salesStatus: SalesStatus;
  remaining: number | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  perAccountLimit: number | null;
}

export interface EventPayload {
  event: EventInfo;
  ticketTypes: TicketType[];
}
