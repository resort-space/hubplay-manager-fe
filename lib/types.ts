export type Venue = { id: string; code: string; name: string; address: string; phone: string; active?: boolean };
export type Room = { id: string; name: string; code: string; capacity: number; description: string; active: boolean };
export type Slot = { id: string; slotIndex: number; startTime: string; endTime: string; enabled: boolean; reserved?: boolean };
export type SubGame = {
  id: string;
  name: string;
  code: string;
  basePrice: number;
  tags: string;
  active: boolean;
  roomId: string | null;
  category: { kind: string; name: string };
  room?: Room | null;
};
export type Drink = { id: string; name: string; price: number; active: boolean };
export type DiscountCode = { id: string; code: string; amount: number; active: boolean };
export type Cms = { guide: string; priceNote: string; reviews: string } | null;
export type HomeData = {
  venue: Venue;
  rooms: Room[];
  slots: Slot[];
  drinks: Drink[];
  discounts: DiscountCode[];
  subGames: SubGame[];
  cms: Cms;
};
export type Booking = {
  id: string;
  date: string;
  slotIndex: number;
  phone: string;
  guestName: string;
  email: string;
  playerCount: number;
  status: 'pending_confirm' | 'confirmed' | 'cancelled';
  sessionCode: string | null;
  room: Room;
};
export type Me = { id: string; username?: string; phone?: string; name?: string; role?: string; kind: 'admin' | 'user' } | null;
