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
  status: "draft" | "published" | "cancelled";
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
  viewerHasTicket: boolean;
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
