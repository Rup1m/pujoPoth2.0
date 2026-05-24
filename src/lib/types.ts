
export type Pandal = {
    id: string;
    name: string;
    name_lowercase: string;
    name_bengali: string;
    name_bengali_lowercase: string;
    latitude: number;
    longitude: number;
    type: "popular" | "regular" | "metro";
    zone: "North" | "South" | "Central" | null;
    bonedi: boolean;
};
