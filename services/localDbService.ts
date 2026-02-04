
import { StaticDutyRate } from "../types";

const DB_KEY = "tariff_watch_local_db";

export const saveLocalDb = (data: StaticDutyRate[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

export const getLocalDb = (): StaticDutyRate[] => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearLocalDb = () => {
  localStorage.removeItem(DB_KEY);
};

export const lookupDuty = (
  htsCode: string,
  destination: string,
  origin: string
): StaticDutyRate | null => {
  const db = getLocalDb();
  
  // Clean the input HTS code (remove dots)
  const cleanHts = htsCode.replace(/\./g, "");

  // Priority 1: Exact HTS + Destination + Origin match
  let match = db.find(item => 
    item.htsCode.replace(/\./g, "") === cleanHts && 
    item.destination.toLowerCase() === destination.toLowerCase() &&
    (item.origin ? item.origin.toLowerCase() === origin.toLowerCase() : true)
  );

  if (match) return match;

  // Priority 2: Exact HTS + Destination match (generic origin)
  match = db.find(item => 
    item.htsCode.replace(/\./g, "") === cleanHts && 
    item.destination.toLowerCase() === destination.toLowerCase()
  );

  return match || null;
};

export const parseCsv = (text: string): StaticDutyRate[] => {
  const lines = text.split("\n").filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Expected headers: htsCode, destination, dutyRate, description, origin(optional)
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const obj: any = {};
    headers.forEach((header, i) => {
      if (header === "dutyrate") {
        obj.dutyRate = parseFloat(values[i]);
      } else {
        const key = header === "htscode" ? "htsCode" : header;
        obj[key] = values[i];
      }
    });
    return obj as StaticDutyRate;
  });
};
