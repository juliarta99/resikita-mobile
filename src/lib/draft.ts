export type LocDraft = { lat: number; lng: number; alamat: string };
let pending: LocDraft | null = null;
export const locationDraft = {
  set: (v: LocDraft) => {
    pending = v;
  },
  take: (): LocDraft | null => {
    const v = pending;
    pending = null;
    return v;
  },
};
